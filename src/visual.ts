"use strict";

import { select, create } from "d3-selection";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { interactivitySelectionService } from "powerbi-visuals-utils-interactivityutils";
import { interactivityBaseService } from "powerbi-visuals-utils-interactivityutils";
import { createTooltipServiceWrapper, ITooltipServiceWrapper } from 'powerbi-visuals-utils-tooltiputils/lib/src';
// Removed tooltip utils import (reverting tooltip support)
import { valueType } from "powerbi-visuals-utils-typeutils";
import Prism from 'prismjs';
import 'prismjs/themes/prism.css'

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import ISelectionId = powerbi.extensibility.ISelectionId;
import IViewport = powerbi.IViewport;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import VisualFormattingSettingsModel from "./settings";
import "./../style/visual.less";

const EmptyCssPlaceholder = "/*\n\tPut your custom CSS here.\n\tDefault LESS source can be found here:\n\thttps://github.com/Xpedited-Consulting/pbi-html-table/blob/main/style/visual.less\n*/\n\n";

type VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
type TooltipMode = "standard" | "html" | "reportPage";
type CellDatum = {
    definition: powerbi.DataViewMetadataColumn;
    value: any;
    idx: number;
    selectionId: ISelectionId;
    tooltipItems: VisualTooltipDataItem[] | null;
};

export class Visual implements IVisual {
    private static readonly paginationStorageKeyPrefix: string = "pbi-html-table:pagination:";
    private target: d3.Selection<any, any, any, any>;
    private table: d3.Selection<any, any, any, any>;
    private tHead: d3.Selection<any, any, any, any>;
    private tBody: d3.Selection<any, any, any, any>;
    private customStyle: d3.Selection<any, any, any, any>;
    private paginationControl: d3.Selection<any, any, any, any>;
    private sortColumn: string;
    private sortDirection: powerbi.SortDirection;
    private totalPages: number;
    private currentPage: number = 0;
    private selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private host: IVisualHost;
    private cssEditor: HTMLTextAreaElement | null;
    private cssHighlightView: HTMLElement | null;
    private htmlViewEl: HTMLElement;
    private tabsContainer: HTMLElement;
    private contentContainer: d3.Selection<any, any, any, any>;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private customTooltip: d3.Selection<any, any, any, any>;
    private updateSequence: number = 0;
    private hasAttemptedPageRestore: boolean = false;
    private suppressNextDataReset: boolean = false;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);

        this.target = select(options.element)
            .classed("xpedited-default-styling", true)
            .on("contextmenu", (ev, _) => {
                const mouseEvent: MouseEvent = ev as MouseEvent;
                    this.selectionManager.showContextMenu(null, {
                        x: ev.clientX,
                        y: ev.clientY
                    });
                mouseEvent.preventDefault();
            });

        this.resetHtml();
    }

    private isImg(str: string): boolean {
        return /\.(jpg|jpeg|png|gif|svg)$/i.test(str);
    }

    private resetHtml() {
        this.cssEditor = null;
        this.cssHighlightView = null;
        this.target.html("");
        this.target.style("position", "relative");

        // Container for report content with custom styling
        this.contentContainer = this.target.append("div").attr("class", "content-container");

        let table: d3.Selection<any, any, any, any> = this.table = this.contentContainer.append("table");
        this.tHead = table.append("thead").append("tr");
        this.tBody = table.append("tbody");

        this.paginationControl = this.contentContainer.append("div").attr("class", "pagination");

        this.customStyle = this.contentContainer.append("style");
        this.customTooltip = this.target.append("div")
            .attr("class", "custom-html-tooltip hidden")
            .attr("aria-hidden", "true");
    }

    private showAdvancedEditMode(generatedHtml: string) {
        // Create tabs + editors once; update HTML content every call
        if (!this.cssEditor) {
            // Clear current visual DOM to show the editor cleanly
            this.target.html("");
            let customCss = this.formattingSettings.generalSettings?._cssTextInput?.value ?? this.formattingSettings.generalSettings?.css?.value;
            if (customCss.trim().length == 0) {
                // set placeholder
                customCss = EmptyCssPlaceholder;
            }

            // Tabs container
            const tabs = document.createElement("div");
            tabs.className = "code-tabs";

            // Nav
            const nav = document.createElement("div");
            nav.className = "code-tabs__nav";

            const btnCss = document.createElement("button");
            btnCss.type = 'button';
            btnCss.textContent = 'CSS';
            btnCss.className = 'active';

            const btnHtml = document.createElement("button");
            btnHtml.type = 'button';
            btnHtml.textContent = 'Preview HTML';

            nav.appendChild(btnCss);
            nav.appendChild(btnHtml);

            // Panels
            const panelCss = document.createElement("div");
            panelCss.className = 'code-tabs__panel active';
            const panelHtml = document.createElement("div");
            panelHtml.className = 'code-tabs__panel';

            // CSS editor
            const editorWrapper = document.createElement("div");
            editorWrapper.className = "code-editor-stack";

            const highlightPre = document.createElement("pre");
            highlightPre.className = "code-editor-highlight language-css";
            const highlightCode = document.createElement("code");
            highlightCode.className = "language-css";
            highlightPre.appendChild(highlightCode);

            const editorDiv = document.createElement("textarea");
            editorDiv.id = "codejar-css-editor";
            editorDiv.className = 'codejar-css-editor';
            editorDiv.value = customCss;
            editorDiv.spellcheck = false;
            editorWrapper.appendChild(highlightPre);
            editorWrapper.appendChild(editorDiv);
            panelCss.appendChild(editorWrapper);

            this.cssEditor = editorDiv;
            this.cssHighlightView = highlightCode;
            this.syncCssEditor(customCss);

            this.cssEditor.addEventListener("input", () => {
                this.syncCssEditor(this.cssEditor?.value ?? "");
            });
            this.cssEditor.addEventListener("keydown", (event: KeyboardEvent) => {
                if (event.key !== "Tab" || !this.cssEditor) {
                    return;
                }

                event.preventDefault();

                const insertedWithNativeCommand = document.execCommand("insertText", false, "\t");
                if (!insertedWithNativeCommand) {
                    this.cssEditor.setRangeText("\t", this.cssEditor.selectionStart, this.cssEditor.selectionEnd, "end");
                }

                this.syncCssEditor(this.cssEditor.value);
            });
            this.cssEditor.addEventListener("scroll", () => {
                if (!this.cssEditor) {
                    return;
                }

                highlightPre.scrollTop = this.cssEditor.scrollTop;
                highlightPre.scrollLeft = this.cssEditor.scrollLeft;
            });

            // HTML view (read-only)
            const htmlPre = document.createElement('pre');
            htmlPre.className = 'language-markup';
            this.htmlViewEl = htmlPre;
            panelHtml.appendChild(htmlPre);

            // Tab switching
            btnCss.addEventListener('click', () => {
                btnCss.classList.add('active');
                btnHtml.classList.remove('active');
                panelCss.classList.add('active');
                panelHtml.classList.remove('active');
            });
            btnHtml.addEventListener('click', () => {
                btnHtml.classList.add('active');
                btnCss.classList.remove('active');
                panelHtml.classList.add('active');
                panelCss.classList.remove('active');
            });

            tabs.appendChild(nav);
            tabs.appendChild(panelCss);
            tabs.appendChild(panelHtml);
            this.target.node().appendChild(tabs);
            this.tabsContainer = tabs;
        }

        if (this.htmlViewEl) {
            // Ensure the HTML is not rendered by using textContent
            const pretty = this.prettyPrintHtml(generatedHtml || '');
            this.htmlViewEl.textContent = pretty;
            Prism.highlightElement(this.htmlViewEl);
        }
    }

    private applyCustomCss(customCss?: string) {
        const isCustomEnabled = this.formattingSettings.generalSettings.CustomStylingEnabled.value;
        const cssStrategy = this.formattingSettings.generalSettings.cssStrategy.value.value;
        customCss = customCss ?? this.formattingSettings.generalSettings.css.value;

        this.target.classed("off", isCustomEnabled && cssStrategy == "replace");

        this.customStyle.html(isCustomEnabled ? customCss : "");
    }

    private updateCssHighlight(css: string): void {
        if (!this.cssHighlightView) {
            return;
        }

        const content = css.length > 0 ? css : " ";
        this.cssHighlightView.textContent = content;
        Prism.highlightElement(this.cssHighlightView);
    }

    private syncCssEditor(css: string): void {
        const updatedCss = css === EmptyCssPlaceholder ? "" : css;

        this.updateCssHighlight(updatedCss);
        this.applyCustomCss(updatedCss);

        this.host.persistProperties({
            merge: [
                {
                    objectName: "general",
                    selector: null,
                    properties: {
                        css: updatedCss.replace(EmptyCssPlaceholder, ''),
                        _cssTextInput: updatedCss
                    }
                }
            ]
        });
    }

    private getTooltipMode(): TooltipMode {
        return (this.formattingSettings.tooltipSettings.tooltipMode.value.value || "standard") as TooltipMode;
    }

    public update(options: VisualUpdateOptions): void {
        if (!options?.dataViews?.[0]?.table) {
            return;
        }

        const updateSequence = ++this.updateSequence;
        void this.renderUpdate(options, updateSequence);
    }

    private async renderUpdate(options: VisualUpdateOptions, updateSequence: number): Promise<void> {
        this.hideCustomTooltip();
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0]);
        this.updateContainerViewports(options.viewport);

        const dataView = options.dataViews && options.dataViews[0];
        if (!dataView?.table) {
            return;
        }

        await this.resolvePaginationState(options, dataView.table);
        if (updateSequence !== this.updateSequence) {
            return;
        }

        if (options.editMode === powerbi.EditMode.Advanced) {
            // In advanced mode, render a read-only HTML view alongside the CSS editor
            let generated = '';
            try {
                generated = this.buildTableHtml(options);
            } catch {}
            this.showAdvancedEditMode(generated);
            return;
        }

        this.resetHtml();
        this.applyCustomCss();

        const roleIndex = (col: powerbi.DataViewMetadataColumn) => {
            if ("dataset" in col["rolesIndex"]) {
                const dSetIdxs = col["rolesIndex"]["dataset"];
                return .0 + dSetIdxs[0];
            }
            return Number.MAX_SAFE_INTEGER;
        } 

        let data = options.dataViews[0].table;
        let rows = data.rows;
        let columns = data.columns;
        let pageStart = 0;

        const sortColumns = data.columns.filter(x => x.roles["sort"] === true);

        if (this.formattingSettings.paginationSettings.paginationEnabled.value)
        {
            let pageSize = this.getPageSize();
            pageStart = this.currentPage * pageSize;

            rows = rows.slice(pageStart, pageStart + pageSize);
        }

        if (!data.rows.length) {
            this.renderEmptyState();
            return;
        }

        let _this = this;
        
        select("#sandbox-host")
            .attr("overflow", this.formattingSettings.tableSettings.overflow.value.value);

        const tHeadData = columns
            // Retrieve roleIndex for the correct order
            .map(col => ({ col, "idx": roleIndex(col) }))
            // Order based on that index
            .sort((a,b) => a.idx - b.idx)
            // Only keep rows that are part of Dataset
            .filter(x => x.idx < Number.MAX_SAFE_INTEGER)
            .map(x => x.col);

        if (this.formattingSettings.tableSettings.header.value.value != "hidden") {
            this.tHead
                .selectAll("th")
                .data(tHeadData)
                .enter().append("th")
                .text(d => d.displayName)
                .classed("sticky", this.formattingSettings.tableSettings.header.value.value == "sticky")
                .classed("sorted-asc", d => d.queryName == _this.sortColumn && _this.sortDirection == powerbi.SortDirection.Ascending)
                .classed("sorted-desc", d => d.queryName == _this.sortColumn && _this.sortDirection == powerbi.SortDirection.Descending)
                .on('click', function(ev, d) { 
                    
                    let queryName = d.queryName;
                    if (sortColumns) {
                        const alternativeSortKey = sortColumns.find(x => x.displayName == d.displayName);
                        if (alternativeSortKey) {
                            queryName = alternativeSortKey.queryName;
                        }
                    }
                    _this.host.persistProperties({
                        merge: [
                            {
                                objectName: "filterSetting",
                                selector: undefined, 
                                properties: {
                                    queryName: queryName
                                }
                            }
                        ]
                    });
                    
                    _this.setSortColumn(d.queryName, queryName); 
                });
        }

        const tooltipColumns = columns.map((c, ix) => ({ col: c, ix })).filter(x => x.col.roles && x.col.roles["tooltips"] === true);

        const rowEnter = this.tBody
            .selectAll("tr")
            .data(rows.map(function(r, ix) {
                let idx = ix + pageStart;
                const selectionID: ISelectionId = _this.host.createSelectionIdBuilder()
                    .withTable(data, idx)
                    .createSelectionId();
                
                return { row: r, selectionId: selectionID };
            }))
            .enter().append("tr")
            .on("click", (ev, d) => {
                if (this.formattingSettings.tableSettings.dataSelectable.value) {
                    const mouseEvent: MouseEvent = ev as MouseEvent;
                    _this.selectionManager.select(d.selectionId);

                    select(ev.currentTarget.parentNode)
                        .selectAll("tr")
                        .classed("selected", (x: { selectionId: ISelectionId }) => _this.selectionManager.getSelectionIds().includes(x.selectionId));
                }
            })
            .on('contextmenu', async (ev, d) => {
                    const mouseEvent: MouseEvent = ev as MouseEvent;
                    mouseEvent.preventDefault();
                    mouseEvent.stopPropagation();

                    const newSelection = await _this.selectionManager.select(d.selectionId);

                    await _this.selectionManager.showContextMenu(newSelection[0], {
                        x: ev.clientX,
                        y: ev.clientY
                    });
                }
            );

        const cellEnter = rowEnter
            .selectAll("td")
            .data(d => 
                d.row.map((r, idx) => {
                    let col = data.columns[idx];
                    let colIdx = roleIndex(col);
                    let items: VisualTooltipDataItem[] | null = null;
                    try {
                        const tooltipItems = tooltipColumns
                            .map(tc => {
                                const val = d.row[tc.ix];
                                const stringValue = val == null ? "" : val.toString().trim();
                                if (!stringValue) {
                                    return null;
                                }

                                return {
                                    displayName: tc.col.displayName,
                                    value: stringValue
                                };
                            })
                            .filter((item): item is VisualTooltipDataItem => item != null);

                        if (tooltipItems.length) {
                            items = tooltipItems;
                        }
                    } catch {
                        items = null;
                    }

                    return {"definition": col, "value": r, "idx": colIdx, selectionId: d.selectionId, tooltipItems: items } as CellDatum;
                })
                .sort((a, b) => a.idx - b.idx)
                .filter(x => x.idx < Number.MAX_SAFE_INTEGER)
            )
            .enter()
            .append("td");

        // Attach cell content
        cellEnter.append(d => this.createElement(d));

        const tooltipMode = this.getTooltipMode();
        if (tooltipColumns.length > 0 && tooltipMode === "html") {
            cellEnter
                .on("pointerover", (ev, cellData: CellDatum) => this.showCustomTooltip(ev, cellData))
                .on("pointermove", (ev, cellData: CellDatum) => this.showCustomTooltip(ev, cellData))
                .on("pointerout", () => this.hideCustomTooltip());
        } else if (tooltipColumns.length > 0) {
            this.tooltipServiceWrapper.addTooltip(
                cellEnter as any,
                (cellData: CellDatum) => this.getTooltipDataForCell(cellData),
                (cellData: CellDatum) => cellData?.selectionId
            );
        }

        if (this.formattingSettings.tableSettings.convertAnchors.value) {
            (this.tBody.node() as HTMLElement)?.querySelectorAll("a").forEach(el => {
                el.addEventListener("click", (ev) => {
                    const target = ev.target as HTMLAnchorElement;
                    try {
                        if (target && target.href) {
                            const url = new URL(target.href);
                            ev.preventDefault();
                            _this.host.launchUrl(url.href);
                        }
                    }
                    catch {}
                })
            });
        }

        if (this.formattingSettings.paginationSettings.paginationEnabled.value) {
            this.totalPages = this.getLastPageIndex(data.rows.length, this.getPageSize());
            this.paginationControl
                .selectAll("button")
                .data(_this.generatePaginationItems())
                .enter()
                .append("button")
                  .attr("class", function (d) { return d.value == _this.currentPage ? "btn-pagination current" : "btn-pagination"; })
                .html(function (d) { return d.label; })
                .on('click', function(ev, d) {
                    _this.hideCustomTooltip();
                    _this.suppressNextDataReset = true;
                    _this.currentPage = d.value;
                    _this.update(options);
                });
        }
    }

    private getTooltipDataForCell(cell: { tooltipItems?: VisualTooltipDataItem[] | null }): VisualTooltipDataItem[] | null {
        if (!cell?.tooltipItems || !Array.isArray(cell.tooltipItems) || cell.tooltipItems.length === 0) {
            return null;
        }

        return cell.tooltipItems;
    }

    private showCustomTooltip(ev: PointerEvent, cellData: CellDatum): void {
        const tooltipItems = this.getTooltipDataForCell(cellData);
        if (!tooltipItems) {
            this.hideCustomTooltip();
            return;
        }

        const tooltipNode = this.customTooltip.node() as HTMLElement;
        tooltipNode.replaceChildren(this.buildCustomTooltipContent(tooltipItems));
        this.customTooltip
            .classed("hidden", false)
            .attr("aria-hidden", "false");

        this.positionCustomTooltip(ev);
    }

    private positionCustomTooltip(ev: PointerEvent): void {
        if (!this.customTooltip) {
            return;
        }

        const hostRect = (this.target.node() as HTMLElement).getBoundingClientRect();
        const tooltipNode = this.customTooltip.node() as HTMLElement;
        const offset = 12;
        const maxLeft = Math.max(0, hostRect.width - tooltipNode.offsetWidth - offset);
        const maxTop = Math.max(0, hostRect.height - tooltipNode.offsetHeight - offset);
        const left = Math.min(Math.max(0, ev.clientX - hostRect.left + offset), maxLeft);
        const top = Math.min(Math.max(0, ev.clientY - hostRect.top + offset), maxTop);

        this.customTooltip
            .style("left", `${left}px`)
            .style("top", `${top}px`);
    }

    private hideCustomTooltip(): void {
        if (!this.customTooltip) {
            return;
        }

        this.customTooltip
            .classed("hidden", true)
            .attr("aria-hidden", "true");

        (this.customTooltip.node() as HTMLElement).replaceChildren();
    }

    private buildCustomTooltipContent(tooltipItems: VisualTooltipDataItem[]): DocumentFragment {
        const fragment = document.createDocumentFragment();

        if (tooltipItems.length === 1) {
            const value = document.createElement("div");
            value.className = "custom-html-tooltip__value";
            value.appendChild(this.sanitizeTooltipHtml(tooltipItems[0].value));
            fragment.appendChild(value);
            return fragment;
        }

        tooltipItems.forEach(item => {
            const section = document.createElement("div");
            section.className = "custom-html-tooltip__section";

            const label = document.createElement("div");
            label.className = "custom-html-tooltip__label";
            label.textContent = item.displayName || "";

            const value = document.createElement("div");
            value.className = "custom-html-tooltip__value";
            value.appendChild(this.sanitizeTooltipHtml(item.value));

            section.appendChild(label);
            section.appendChild(value);
            fragment.appendChild(section);
        });

        return fragment;
    }

    private sanitizeTooltipHtml(value: string): DocumentFragment {
        const parser = new DOMParser();
        const documentFragment = document.createDocumentFragment();
        const parsedDocument = parser.parseFromString(value || "", "text/html");

        Array.from(parsedDocument.body.childNodes).forEach(node => {
            const sanitizedNode = this.sanitizeTooltipNode(node);
            if (sanitizedNode) {
                documentFragment.appendChild(sanitizedNode);
            }
        });

        return documentFragment;
    }

    private sanitizeTooltipNode(node: Node): Node | null {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent || "");
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        if (["script", "style", "iframe", "object", "embed", "link", "meta"].includes(tagName)) {
            return null;
        }

        const sanitizedElement = document.createElement(tagName);
        Array.from(element.attributes).forEach(attr => {
            const attrName = attr.name.toLowerCase();
            const attrValue = attr.value.trim();
            if (attrName.startsWith("on")) {
                return;
            }

            if ((attrName === "href" || attrName === "src") && attrValue.toLowerCase().startsWith("javascript:")) {
                return;
            }

            sanitizedElement.setAttribute(attr.name, attr.value);
        });

        Array.from(element.childNodes).forEach(childNode => {
            const sanitizedChildNode = this.sanitizeTooltipNode(childNode);
            if (sanitizedChildNode) {
                sanitizedElement.appendChild(sanitizedChildNode);
            }
        });

        return sanitizedElement;
    }

    private buildTableHtml(options: VisualUpdateOptions): string {
        // Build HTML string of the table using D3 (detached DOM)
        try {
            const dataView = options.dataViews && options.dataViews[0];
            if (!dataView || !dataView.table) return '';

            const tableData = dataView.table;
            const allRows = tableData.rows || [];
            const columns = tableData.columns || [];

            // Pagination logic
            let rows = allRows;
            let pageStart = 0;
            if (this.formattingSettings?.paginationSettings?.paginationEnabled?.value) {
                const pageSize = this.getPageSize();
                pageStart = this.currentPage * pageSize;
                if (pageStart >= rows.length) {
                    pageStart = 0;
                }
                rows = rows.slice(pageStart, pageStart + pageSize);
            }

            // Empty state mirrors renderEmptyState
            if (!rows.length) {
                const wrapper = create('div').attr('class', 'empty-state');
                wrapper.append('div')
                    .html(this.formattingSettings.tableSettings.emptyStateHtml.value || this.formattingSettings.tableSettings.emptyStateHtml.placeholder);
                return (wrapper.node() as HTMLElement).outerHTML;
            }

            const roleIndex = (col: powerbi.DataViewMetadataColumn) => {
                if ((col as any)["rolesIndex"] && "dataset" in (col as any)["rolesIndex"]) {
                    const dSetIdxs = (col as any)["rolesIndex"]["dataset"];
                    return 0 + dSetIdxs[0];
                }
                return Number.MAX_SAFE_INTEGER;
            }

            const tableSel = create('table');

            // Header
            const showHeader = this.formattingSettings.tableSettings.header.value.value != "hidden";
            if (showHeader) {
                const theadSel = tableSel.append('thead');
                const trSel = theadSel.append('tr');
                const tHeadData = columns
                    .map(col => ({ col, idx: roleIndex(col) }))
                    .sort((a,b) => a.idx - b.idx)
                    .filter(x => x.idx < Number.MAX_SAFE_INTEGER)
                    .map(x => x.col);

                trSel.selectAll('th')
                    .data(tHeadData as any)
                    .enter()
                    .append('th')
                    .text((d: any) => d.displayName)
                    .classed('sticky', this.formattingSettings.tableSettings.header.value.value == "sticky")
                    .classed('sorted-asc', (d: any) => d.queryName == this.sortColumn && this.sortDirection == powerbi.SortDirection.Ascending)
                    .classed('sorted-desc', (d: any) => d.queryName == this.sortColumn && this.sortDirection == powerbi.SortDirection.Descending);
            }

            // Body
            const tbodySel = tableSel.append('tbody');
            rows.forEach((r) => {
                const tr = tbodySel.append('tr');
                const cells = r.map((cellVal, cix) => {
                    const col = columns[cix];
                    const colIdx = roleIndex(col);
                    return { definition: col as any, value: cellVal, idx: colIdx };
                })
                .sort((a,b) => a.idx - b.idx)
                .filter(x => x.idx < Number.MAX_SAFE_INTEGER);

                cells.forEach(cell => {
                    tr.append('td').append(() => this.createElement(cell));
                });
            });

            return (tableSel.node() as HTMLElement).outerHTML;
        } catch (e) {
            return '';
        }
    }

    private prettyPrintHtml(html: string): string {
      try {
            const tab = '\t';
            let indentLevel = 0;
            const out = [];

            // List of void elements (never have closing tags)
            const voidTags = new Set([
            'area','base','br','col','embed','hr','img','input','link',
            'meta','param','source','track','wbr'
            ]);

            // Tokenize into tags or text nodes
            const tokens = html.match(/<\/?[^>]+>|[^<]+/g) || [];

            const isOpeningTag = t => /^<([a-zA-Z][^\s/>]*)[^>]*>$/.test(t);
            const getTagName   = t => (t.match(/^<\/?\s*([a-zA-Z][^\s/>]*)/) || [,''])[1].toLowerCase();
            const isClosingTag = t => /^<\/\s*[a-zA-Z][^>]*>$/.test(t);
            const isSelfClose  = t => /\/>$/.test(t);

            for (let i = 0; i < tokens.length; i++) {
            let tok = tokens[i];

            if (tok.startsWith('<')) {
                // TAG
                if (isClosingTag(tok)) {
                // dedent before writing closing tag
                indentLevel = Math.max(0, indentLevel - 1);
                out.push(tab.repeat(indentLevel) + tok);
                } else {
                const name = getTagName(tok);
                const selfClosing = isSelfClose(tok) || voidTags.has(name);

                out.push(tab.repeat(indentLevel) + tok);

                // Increase indent after opening non-void, non-self-closing tag
                if (!selfClosing) {
                    indentLevel += 1;
                }
                }
            } else {
                // TEXT NODE
                const text = tok.replace(/\s+\n|\n\s+/g, '\n').trim();
                if (text) {
                // Put text at current indent level (one line per text chunk)
                text.split('\n').forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed) out.push(tab.repeat(indentLevel) + trimmed);
                });
                }
            }
            }

            return out.join('\r\n');
        } catch {
            return html;
        }
    }

    private updateContainerViewports(viewport: IViewport): void {
        if (!viewport) {
            return;
        }
        const width: number = viewport.width;
        this.tHead.classed("dynamic", width > 400);
        this.table.attr("width", width);
    }

    private round(x: number, n?: number) {
        return n == null ? Math.round(x) : Math.round(x * (n = Math.pow(10, n))) / n;
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private setSortColumn(sortIdentifier: string, queryName: string) {
        if (this.sortColumn == sortIdentifier) {
            this.sortDirection = this.sortDirection == powerbi.SortDirection.Ascending
                ? powerbi.SortDirection.Descending
                : powerbi.SortDirection.Ascending;
        }
        else {
            this.sortColumn = sortIdentifier;
            this.sortDirection = powerbi.SortDirection.Ascending;
        }

        this.host.applyCustomSort({
            sortDescriptors: [
                {
                    queryName: queryName,
                    sortDirection: this.sortDirection
                }
            ]
        });
    };

    private renderEmptyState() {
        this.resetHtml();
        this.hideCustomTooltip();

        this.target
          .append("div")
          .attr("class", "empty-state")
          .append("div")
          .html(this.formattingSettings.tableSettings.emptyStateHtml.value || this.formattingSettings.tableSettings.emptyStateHtml.placeholder);
    }

    private createElement(el) {
        const definition: powerbi.DataViewMetadataColumn = el.definition;
        if (el.value === null)
            return create("span").node();
        
        const value = el.value.toString();

        const elType = valueType.ValueType.fromDescriptor(definition.type);
        if (this.isImg(value) || (elType.misc && (elType.misc.image || elType.misc.imageUrl))) {
            const fallbackImg = this.formattingSettings.tableSettings.fallbackImage.value;
            return create("img")
                .attr("alt", value)
                .attr("src", value)
                .attr("onerror", () => fallbackImg ? `this.onerror=null;this.src='${fallbackImg}'` : '')
                .node()
        }

        return create("span").html(value).node();
    }

    private getPageSize(): number {
        return Math.max(1, this.formattingSettings.paginationSettings.pagination.value || 1);
    }

    private getLastPageIndex(rowCount: number, pageSize: number): number {
        if (rowCount <= 0) {
            return 0;
        }

        return Math.max(0, Math.ceil(rowCount / pageSize) - 1);
    }

    private clampPage(page: number, lastPage: number): number {
        return Math.max(0, Math.min(page, lastPage));
    }

    private getPaginationStorageKey(): string {
        return `${Visual.paginationStorageKeyPrefix}${this.host.instanceId}`;
    }

    private getDataFingerprint(data: powerbi.DataViewTable): string {
        const columns = (data.columns || []).map(col => `${col.queryName}|${col.displayName}`).join(";");
        const rows = data.rows || [];
        const sampleIndexes = Array.from(new Set([
            0,
            1,
            2,
            Math.floor(rows.length / 2),
            Math.max(rows.length - 3, 0),
            Math.max(rows.length - 2, 0),
            Math.max(rows.length - 1, 0)
        ].filter(index => index >= 0 && index < rows.length)));
        const rowSignature = sampleIndexes
            .map(index => `${index}:${rows[index].map(value => value == null ? "" : String(value)).join("|")}`)
            .join(";");

        return `${rows.length}::${columns}::${rowSignature}`;
    }

    private async canUseStorage(): Promise<boolean> {
        try {
            return (await this.host.storageService.status()) === powerbi.PrivilegeStatus.Allowed;
        } catch {
            return false;
        }
    }

    private async restorePersistedPageState(fingerprint: string): Promise<number | null> {
        if (this.hasAttemptedPageRestore) {
            return null;
        }

        this.hasAttemptedPageRestore = true;

        if (!await this.canUseStorage()) {
            return null;
        }

        try {
            const rawState = await this.host.storageService.get(this.getPaginationStorageKey());
            const state = JSON.parse(rawState);
            if (!state || state.fingerprint !== fingerprint || !Number.isInteger(state.page)) {
                return null;
            }

            return state.page;
        } catch {
            return null;
        }
    }

    private async persistPageState(fingerprint: string): Promise<void> {
        if (!await this.canUseStorage()) {
            return;
        }

        try {
            await this.host.storageService.set(this.getPaginationStorageKey(), JSON.stringify({
                fingerprint,
                page: this.currentPage
            }));
        } catch {}
    }

    private async clearPersistedPageState(): Promise<void> {
        if (!await this.canUseStorage()) {
            return;
        }

        try {
            this.host.storageService.remove(this.getPaginationStorageKey());
        } catch {}
    }

    private async resolvePaginationState(options: VisualUpdateOptions, data: powerbi.DataViewTable): Promise<void> {
        const paginationSettings = this.formattingSettings.paginationSettings;
        if (!paginationSettings.paginationEnabled.value) {
            this.currentPage = 0;
            this.suppressNextDataReset = false;
            await this.clearPersistedPageState();
            return;
        }

        const pageSize = this.getPageSize();
        const lastPage = this.getLastPageIndex((data.rows || []).length, pageSize);
        const isDataUpdate = (options.type & powerbi.VisualUpdateType.Data) === powerbi.VisualUpdateType.Data;
        const shouldResetOnDataUpdate = paginationSettings.resetToFirstPageOnDataUpdate.value && isDataUpdate && !this.suppressNextDataReset;
        const shouldRetainPage = paginationSettings.retainPageOnNavigation.value;
        const fingerprint = this.getDataFingerprint(data);

        if (shouldResetOnDataUpdate) {
            this.currentPage = 0;
        } else if (shouldRetainPage) {
            const restoredPage = await this.restorePersistedPageState(fingerprint);
            if (restoredPage != null) {
                this.currentPage = restoredPage;
            }
        }

        this.currentPage = this.clampPage(this.currentPage, lastPage);
        this.suppressNextDataReset = false;

        if (shouldRetainPage) {
            await this.persistPageState(fingerprint);
        } else {
            await this.clearPersistedPageState();
        }
    }
    
    private generatePaginationItems() {
        let currentPage = this.currentPage;
        let lastPage = this.totalPages;
        let nButtons = this.formattingSettings.paginationSettings.paginationItemCount.value;

        let availableItems: { label: any; value: number; }[] = [];

        availableItems.push({
            label: currentPage + 1,
            value: currentPage
        });

        let i = 0;
        for (i = 1; i < nButtons; i++) {
            availableItems.push({
                label: currentPage + i + 1,
                value: currentPage + i
            });
            availableItems.push({
                label: currentPage - i + 1,
                value: currentPage - i
            });
        }

        availableItems = availableItems.filter(function(item) { return item.value >= 0 && item.value <= lastPage; });
        availableItems.sort(function (a, b) { return (b.value - currentPage) - (a.value - currentPage); });
        availableItems = availableItems.slice(0, nButtons);
        availableItems.sort(function (a,b) { return a.value - b.value; });

        if (currentPage < lastPage) {
            availableItems.push({ label: "&raquo;", value: currentPage + 1 });
        }
        if (currentPage > 0) {
            availableItems.unshift({ label: "&laquo;", value: currentPage - 1 });
            if (this.formattingSettings.paginationSettings.showFirstPageButton.value) {
                availableItems.unshift({ label: "&laquo;&laquo;", value: 0 });
            }
        }
        if (this.formattingSettings.paginationSettings.showLastPageButton.value && currentPage < lastPage) {
            availableItems.push({ label: "&raquo;&raquo;", value: lastPage });
        }

        return availableItems;
    }
}
