"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";


import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;

const overflowItems = [
    { "value": "", "displayName": "Hidden" },
    { "value": "scrollX", "displayName": "Scroll horizontal" },
    { "value": "scrollY", "displayName": "Scroll vertical" },
    { "value": "scroll", "displayName": "Scroll" }
];

const headerVisibilityItems = [
    { value: 'normal', displayName: 'Normal' },
    { value: 'sticky', displayName: 'Sticky' },
    { value: 'hidden', displayName: 'Hidden' },
];

const cssStrategyItems = [
    { "value": "replace", "displayName": "Replaces default" },
    { "value": "overwrite", "displayName": "Overwrites default" },
]

class TableSettings extends FormattingSettingsCard {
    sorting = new formattingSettings.ToggleSwitch({
        name: "sorting", // Property name from capabilities.json
        displayName: "Column sorting",
        value: true
    });

    header = new formattingSettings.ItemDropdown({
        name: "header",
        displayName: "Header row",
        description: "Visibility state of header.",
        items: headerVisibilityItems,
        value: headerVisibilityItems[0]
    });

    overflow = new formattingSettings.ItemDropdown({
        name: "overflow",
        displayName: "Overflow",
        description: "Choose what happens to content when it is clipped by its container",
        items: overflowItems,
        value: overflowItems[0]
    });

    dataSelectable = new formattingSettings.ToggleSwitch({
        name: "dataSelectable",
        displayName: "Table row selectable",
        description: "Toggle which indicates whether the table rows are selectable and applies cross filtering for other visuals.",
        value: true
    });

    convertAnchors = new formattingSettings.ToggleSwitch({
        name: "convertAnchors",
        displayName: "Support anchor links",
        description: "Automatically convert anchor elements to support for opening in new window.",
        value: true
    });

    fallbackImage = new formattingSettings.TextInput({
        name: "fallbackImage", // Property name from capabilities.json
        displayName: "Fallback image",
        value: "",
        placeholder: "Image URL",
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    });

    emptyStateHtml = new formattingSettings.TextArea({
        name: "emptyStateHtml", // Property name from capabilities.json
        displayName: "Empty state HTML",
        value: "No results found",
        placeholder: "No results found",
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    });


    name: string = "table"; // Object name from capabilities.json
    displayName: string = "Table";
    slices: Array<FormattingSettingsSlice> = [this.header, this.overflow, this.dataSelectable, this.convertAnchors, this.sorting, this.fallbackImage, this.emptyStateHtml];
}

class PaginationSettings extends FormattingSettingsCard {
    paginationEnabled = new formattingSettings.ToggleSwitch({
        name: "show", // Property name from capabilities.json
        displayName: "Pagination",
        value: false
    })
    paginationItemCount = new formattingSettings.NumUpDown({
        name: "paginationItemCount", // Property name from capabilities.json
        displayName: "Page navigation buttons",
        description: "The number of page navigation buttons to render (exclusive of “next”/“previous” arrows)",
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 10, type: powerbi.visuals.ValidatorType.Max }
        },
        value: 3,
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    });
    pagination = new formattingSettings.NumUpDown({
        name: "pageSize", // Property name from capabilities.json
        displayName: "Page size",
        description: "Number of results the table should show per page",
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min }
        },
        value: 10,
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    })

    topLevelSlice = this.paginationEnabled
    name: string = "pagination"; // Object name from capabilities.json
    displayName: string = "Pagination";
    slices: Array<FormattingSettingsSlice> = [this.paginationEnabled, this.pagination, this.paginationItemCount];
}

class GeneralSettings extends FormattingSettingsCard {
    CustomStylingEnabled = new formattingSettings.ToggleSwitch({
        name: "customCssEnabled", // Property name from capabilities.json
        displayName: "Custom styling",
        value: false
    })

    explanation = new formattingSettings.ReadOnlyText({
        name: "explanation",
        displayName: "ℹ️ Explanation",
        value: "CSS can be edited through the Advanced Edit by clicking the three dots and selecting Edit",
        description: "",
        instanceKind: powerbi.VisualEnumerationInstanceKinds.Constant,
    });

    cssStrategy = new formattingSettings.ItemDropdown({
        name: "cssStrategy",
        displayName: "How to apply the CSS",
        description: "",
        items: cssStrategyItems,
        value: cssStrategyItems[1]
    });

    css = new formattingSettings.ReadOnlyText({
        name: "css", // Property name from capabilities.json
        displayName: "Custom CSS",
        value: "",
        description: "CSS can be edited through the Advanced Edit by clicking the three dots and selecting Edit",
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule,
    });

    _cssTextInput = new formattingSettings.TextArea({
        name: "_cssTextInput",
        description: "Hidden input for storing Monaco editor input",
        placeholder: "",
        value: "",
        visible: false
    });

    topLevelSlice = this.CustomStylingEnabled
    name: string = "general"
    displayName?: string = "Advanced styling"
    slices?: Array<FormattingSettingsSlice> = [this._cssTextInput, this.CustomStylingEnabled, this.explanation, this.cssStrategy, this.css];
}

export default class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // TODO: fill all visual settings here
    public tableSettings: TableSettings = new TableSettings();
    public paginationSettings: PaginationSettings = new PaginationSettings();
    public generalSettings: GeneralSettings = new GeneralSettings();
    cards = [this.generalSettings, this.tableSettings, this.paginationSettings];
}