/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/

"use strict";

import { transpose } from "d3-array";
import { formatPrefix } from "d3-format";
import { select, local, create } from "d3-selection";
import "./../style/visual.less";
import { Behavior } from "./BaseBehaviourOptions"

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { interactivitySelectionService } from "powerbi-visuals-utils-interactivityutils";
import { interactivityBaseService } from "powerbi-visuals-utils-interactivityutils";
import { valueType } from "powerbi-visuals-utils-typeutils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.extensibility.ISelectionId;

import { VisualFormattingSettingsModel } from "./settings";
import { CategoryViewModel, VisualViewModel } from "./visualViewModel";
import { EditorView } from "codemirror"

"use strict";

export interface VisualDataPoint extends interactivitySelectionService.SelectableDataPoint {
    value: powerbi.PrimitiveValue;
}

export class Visual implements IVisual {
    private target: d3.Selection<any, any, any, any>;
    private table: d3.Selection<any, any, any, any>;
    private tHead: d3.Selection<any, any, any, any>;
    private tBody: d3.Selection<any, any, any, any>;
    private paginationControl: d3.Selection<any, any, any, any>;
    private sortColumn: string;
    private sortDirection: powerbi.SortDirection;
    private totalPages: number;
    private currentPage: number = 0;
    private selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private host: IVisualHost;
    private interactivity: interactivityBaseService.IInteractivityService<VisualDataPoint>;
    private editor: EditorView;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.interactivity = interactivitySelectionService.createInteractivitySelectionService(this.host);

        this.target = select(options.element)
            .classed("powerbi-demo-wrapper", true);

        this.resetHtml();
    }

    private isImg(str) {
        return str.match(/\.(jpg|jpeg|png|gif|svg)$/i);
    }

    private resetHtml() {
        this.target.html("");

        let table: d3.Selection<any, any, any, any> = this.table = this.target.append("table")

        this.tHead = table.append("thead").append("tr");
        this.tBody = table.append("tbody");

        this.paginationControl = this.target.append("div").attr("class", "pagination");
    }

    public update(options: VisualUpdateOptions): void {
        this.updateInternal(options, visualTransform(options.dataViews), true);
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

    private replaceNullWithEmptyString(val) {
        return val === "null" ? '' : val;
    
    }
    private renderEmptyState() {
        this.resetHtml();

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
    
    private generatePaginationItems() {
        let currentPage = this.currentPage;
        let lastPage = this.totalPages;
        let nButtons = this.formattingSettings.paginationSettings.paginationItemCount.value;

        let availableItems: { label: any; value: number; }[] = [];/*[
            { label: currentPage - 1, value: currentPage - 2 },
            { label: currentPage, value: currentPage - 1 },
            { label: currentPage + 1, value: currentPage },
            { label: currentPage + 2, value: currentPage + 1 },
            { label: currentPage + 3, value: currentPage + 2 },
        ];*/

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
            console.log(availableItems);
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
        }

        return availableItems;
    }


    public updateInternal(options: VisualUpdateOptions, viewModel: VisualViewModel, hasNewData: boolean = false): void {
        if (!viewModel) {
            return;
        }

        // Peform reset here
        this.resetHtml();

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);
        this.updateContainerViewports(options.viewport);

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
            let pageSize = this.formattingSettings.paginationSettings.pagination.value;
            pageStart = this.currentPage * pageSize;

            // If the dataset changes and the amount of pages is less than the current page, reset it to the first page
            if (pageStart >= rows.length) {
                this.currentPage = pageStart = 0;
            }

            rows = rows.slice(pageStart, pageStart + pageSize);
        }

        if (!data.rows.length) {
            this.renderEmptyState();
            return;
        }

        let _this = this;

        const tHeadData = columns
            // Retrieve roleIndex for the correct order
            .map(col => ({ col, "idx": roleIndex(col) }))
            // Order based on that index
            .sort((a,b) => a.idx - b.idx)
            // Only keep rows that are part of Dataset
            .filter(x => x.idx < Number.MAX_SAFE_INTEGER)
            .map(x => x.col);

        if (this.formattingSettings.tableSettings.header.value) {
            this.tHead
                .selectAll("th")
                .data(tHeadData)
                .enter().append("th")
                .text(d => d.displayName)
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

        this.tBody
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
            .selectAll("td")
            .data(d => 
                d.row.map((r, idx) => {
                    let col = data.columns[idx];
                    let colIdx = roleIndex(col);
                    return {"definition": col, "value": r, "idx": colIdx };
                })
                .sort((a, b) => a.idx - b.idx)
                .filter(x => x.idx < Number.MAX_SAFE_INTEGER)
            )
            .enter()
            .append("td")
            .append(d => this.createElement(d));

        //this.target.append("div").html("<pre>"+this.formattingSettings.paginationSettings.paginationEnabled.value)

        if (this.formattingSettings.paginationSettings.paginationEnabled.value) {
            this.totalPages = Math.ceil(data.rows.length/this.formattingSettings.paginationSettings.pagination.value) - 1
            this.paginationControl
                .selectAll("button")
                .data(_this.generatePaginationItems())
                .enter()
                .append("button")
                  .attr("class", function (d) { return d.value == _this.currentPage ? "btn-pagination current" : "btn-pagination"; })
                .html(function (d) { return d.label; })
                .on('click', function(ev, d) { _this.currentPage = d.value; _this.updateInternal(options, viewModel); });
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

    private round(x, n) {
        return n == null ? Math.round(x) : Math.round(x * (n = Math.pow(10, n))) / n;
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}