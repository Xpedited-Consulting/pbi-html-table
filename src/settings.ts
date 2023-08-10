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
    })

    name: string = "table"; // Object name from capabilities.json
    displayName: string = "Table";
    slices: Array<FormattingSettingsSlice> = [this.sorting];
}

class PaginationSettings extends FormattingSettingsCard {
    paginationEnabled = new formattingSettings.ToggleSwitch({
        name: "show", // Property name from capabilities.json
        displayName: "Pagination",
        topLevelToggle: true,
        value: false
    })
    pagination = new formattingSettings.NumUpDown({
        name: "pageSize", // Property name from capabilities.json
        displayName: "Page size",
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min }
        },
        value: 10
    })

    name: string = "pagination"; // Object name from capabilities.json
    displayName: string = "Pagination";
    slices: Array<FormattingSettingsSlice> = [this.paginationEnabled, this.pagination];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // TODO: fill all visual settings here
    public dataPointCardSettings: FormattingSettingsCard = new DataPointCardSettings();
    public tableSettings: TableSettings = new TableSettings();
    public paginationSettings: PaginationSettings = new PaginationSettings();
    cards = [this.dataPointCardSettings, this.tableSettings, this.paginationSettings];
}