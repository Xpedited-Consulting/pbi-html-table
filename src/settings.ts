/*
 *  Power BI Visualizations
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

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";


import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsCard = formattingSettings.Card;
import FormattingSettingsSlice = formattingSettings.Slice;

// TODO: fill all visual settings here
class DataPointCardSettings extends FormattingSettingsCard {
    fill = new formattingSettings.ColorPicker({
        name: "fill", // Property name from capabilities.json
        displayName: "Fill",
        value: { value: "#000000" }
    });

    name: string = "dataPoint"; // Object name from capabilities.json
    displayName: string = "Data colors";
    slices: Array<FormattingSettingsSlice> = [this.fill];
}

class TableSettings extends FormattingSettingsCard {
    sorting = new formattingSettings.ToggleSwitch({
        name: "sorting", // Property name from capabilities.json
        displayName: "Column sorting",
        value: true
    });

    header = new formattingSettings.ToggleSwitch({
        name: "header",
        displayName: "Header row visible",
        description: "Toggle which indicates whether the table has a header row.",
        value: true
    });

    dataSelectable = new formattingSettings.ToggleSwitch({
        name: "dataSelectable",
        displayName: "Table row selectable",
        description: "Toggle which indicates whether the table rows are selectable and applies cross filtering for other visuals.",
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
    slices: Array<FormattingSettingsSlice> = [this.header, this.dataSelectable, this.sorting, this.fallbackImage, this.emptyStateHtml];
}

class PaginationSettings extends FormattingSettingsCard {
    paginationEnabled = new formattingSettings.ToggleSwitch({
        name: "show", // Property name from capabilities.json
        displayName: "Pagination",
        topLevelToggle: true,
        value: false
    })
    paginationItemCount = new formattingSettings.NumUpDown({
        name: "paginationItemCount", // Property name from capabilities.json
        displayName: "Pagination item count",
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
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min }
        },
        value: 10,
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    })

    name: string = "pagination"; // Object name from capabilities.json
    displayName: string = "Pagination";
    slices: Array<FormattingSettingsSlice> = [this.paginationEnabled, this.pagination, this.paginationItemCount];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // TODO: fill all visual settings here
    public dataPointCardSettings: FormattingSettingsCard = new DataPointCardSettings();
    public tableSettings: TableSettings = new TableSettings();
    public paginationSettings: PaginationSettings = new PaginationSettings();
    cards = [this.dataPointCardSettings, this.tableSettings, this.paginationSettings];
}