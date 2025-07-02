HTML Table View (Power BI Visual)
=================================

**Display your data as a fully customizable HTML table within Power BI.** This visual renders tabular data using D3, supports sorting, pagination, custom styling, and configurable empty-state and fallback images.

* * * * *

Support
-------
For questions or bug reports, open a new issue on [GitHub](https://github.com/Xpedited-Consulting/pbi-html-table/issues).  
Describe the problem, steps to reproduce it, and include screenshots if possible.

Overview
--------

The **HTML Table View** visual converts a Power BI dataset into a regular HTML `<table>`, offering:

-   **Column sorting** (clickable headers)

-   **Pagination** (page size, navigation button count, next/previous arrows)

-   **Custom overflow handling** (horizontal/vertical scrolling, clipping)

-   **Row selection** (enables cross-filtering)

-   **Fallback image** (shown when no data or on error)

-   **Empty-state HTML** (customizable text or markup when dataset is empty)

-   **Advanced styling** (inject your own CSS to overwrite or replace the default table styles)

-   **Support for drill-down** via an "Identity" role (optional)

This repository contains the complete source code, format settings, and build scripts needed to develop, debug, and package the visual for use in Power BI Desktop or Power BI Service.

Screenshots
------------------

![Screenshot-1](/assets/screenshot-1.png)
![Screenshot-2](/assets/screenshot-2.png)
![Screenshot-3](/assets/screenshot-3.png)
![Screenshot-4](/assets/screenshot-4.png)

* * * * *

Prerequisites
-------------

Before you begin, make sure you have the following installed:

1.  **Node.js & npm** (LTS version recommended)

2.  **Power BI Visual Tools CLI** (`pbiviz`)

    -   Install globally:

        bash

        CopyEdit

        `npm install -g powerbi-visuals-tools`

3.  **Power BI Desktop** (for testing/debugging the visual locally)

* * * * *

Usage in Power BI
-----------------

Once you import the packaged visual (`.pbiviz`), it can be added to the report canvas. Drag fields into the Data Roles and configure formatting properties in the Visualizations pane.

### Data Roles

1.  **Dataset** (Required)

    -   Drag one or more fields/columns that you want to display as rows in the table. Renaming the fields changes the table header name.

2.  **Identity (optional)**

    -   Hidden identifier column(s) (e.g., row ID). When provided, you can enable drill-down, cross-filtering when highlighting individual rows. Note that identifiers can also be added to the dataset, but then they will be visible.

3.  **Sort (optional)**

    -   Can be used to overwrite sorting behaviour for columns in "Dataset", drag in a field and rename column such that it exactly match one of the "Dataset" columns' query names. During sorting will now use this value instead of the actual table column value.

    -   When sorting is enabled (Format → Table → Column sorting = On), clicking any header will sort by that column; if an alternative sort key is configured, it uses that under the hood.

> **Note:** If you only supply "Dataset" without "Sort," you can still click any header to sort by that field.

* * * * *

### Format Settings

#### 1\. **Table**

-   **Column sorting** (Toggle)

    -   On / Off. When enabled, clicking a header toggles ascending/descending sort on that column.

-   **Header row** (Dropdown)

    -   `hidden` - No header displayed.

    -   `normal` - Static header row.

    -   `sticky` - Header sticks to the top when scrolling.

-   **Content overflow** (Dropdown)

    -   `Hidden` - Content is clipped.

    -   `Scroll horizontal` - Horizontal scroll only.

    -   `Scroll vertical` - Vertical scroll only.

    -   `Scroll` - Both directions scrollable.

-   **Table row selectable** (Toggle)

    -   On / Off. If On, clicking a row performs cross-filtering with other visuals.

-   **Fallback image** (Text)

    -   URL of an image to display if the visual cannot render or if an error occurs.

    -   Leave blank to disable fallback.

-   **Empty state HTML** (Text Area)

    -   Custom HTML or plain text when there is no data in the "Dataset."

    -   Default: `No results found`.

#### 2\. **Pagination**

> Enable pagination to break your table into pages (especially useful when you have large datasets).

-   **Pagination** (Toggle)

    -   On / Off.

-   **Page size** (Number)

    -   How many rows per page (min: 1).

    -   Default: 10.

-   **Page navigation buttons** (Number)

    -   How many page buttons to show (exclusive of "next"/"previous" arrows).

    -   Sets how many page numbers are visible at once.

    -   Eg. If `= 3` and you have 10 pages, you might see "1 2 3 »" on page 1, "« 2 3 4 »" on page 2, etc.

    -   Default: 3.

#### 3\. **Advanced styling**

> When you want full control over table appearance (fonts, colors, borders, etc.).

-   **Custom styling** (Toggle)

    -   On / Off. If Off, the visual uses its default CSS.

-   **Explanation** (Read-only)

    -   A short note explaining how your custom CSS is applied.

-   **CSS strategy** (Dropdown)

    -   `replace` -- Completely replaces the default CSS with your own.

    -   `overwrite` -- Injects your CSS so that it overrides (but does not remove) the default styles.

-   **Custom CSS** (Text Area)

    -   Enter any valid CSS. Accessible through the advanced edit by using the Meatballs menu (. . .) > Edit

    -   The content will be injected into the visual's `<style>` tag based on your chosen "CSS strategy."

> **Pro Tip:** You can target specific elements inside the rendered table using classes or element selectors (e.g., `table td { padding: 8px }`).

* * * * *

Project Structure
-----------------

```pbi-html-table/
├── assets/
│   └── icon.png                      # Visual icon (shown in Power BI Visuals pane)
├── src/
│   ├── settings.ts                   # Defines all Format → Properties pane controls
│   └── visual.ts                     # Main visual code (renders the HTML table)
├── style/
│   └── visual.less                   # Default CSS for the HTML table
├── capabilities.json                 # Data roles, mappings, and format property schema
├── pbiviz.json                       # Visual metadata (name, version, author, icon, URLs)
├── package.json                      # npm dependencies, scripts, and version
└── README.md
```

-   **`pbiviz.json`**\
    Defines `visual.name`, `displayName`, `guid`, `version`, `description`, `supportUrl`, `gitHubUrl`, file paths to `capabilities.json` and `style/visual.less`, etc.

-   **`capabilities.json`**\
    Describes the Data Roles (`dataset`, `identity`, `sort`), DataViewMappings (table rows), and format properties (fallbackImage, emptyStateHtml, pagination settings, etc.).

-   **`src/settings.ts`**\
    Uses the `powerbi-visuals-utils-formattingmodel` to define format cards and settings:

    -   **TableSettings**: sorting, header visibility, overflow, dataSelectable, fallbackImage, emptyStateHtml.

    -   **PaginationSettings**: pageSize, paginationItemCount, toggle for enabling pagination.

    -   **GeneralSettings**: toggle for custom CSS, CSS strategy, and a text area for CSS code.

-   **`src/visual.ts`**

    -   Imports D3, CodeJar & Prism (for potential HTML editing), and Power BI APIs.

    -   Renders a `<table>` inside the visual container based on the incoming `VisualUpdateOptions`.

    -   Handles sorting logic (using the optional "Sort keys" role).

    -   Implements pagination logic (generating page number buttons, next/previous arrows).

    -   Applies format settings (header stickiness, CSS overrides, fallback image, empty-state HTML).

-   **`style/visual.less`**

    -   Default styles for the table, rows, headers, pagination buttons, hover states, and sticky headers.

-   **`package.json`**

    -   **Dependencies**:

        -   `d3` -- Data-driven document library (for creating and updating DOM elements).

        -   `codejar` & `prismjs` -- Lightweight in-browser code editor and syntax highlighting (if you allow editing of the HTML table or custom code within the visual).

        -   `powerbi-models`, `powerbi-visuals-utils-formattingmodel`, `powerbi-visuals-utils-interactivityutils`, `powerbi-visuals-utils-typeutils` -- Official Power BI Visual tooling packages.

    -   **Dev Dependencies**:

        -   `typescript`, `less`, `css-loader`, `style-loader`, `eslint`, `@typescript-eslint`, etc.

    -   **Scripts**:

        -   `npm run start` → `pbiviz start` (launches a dev server).

        -   `npm run package` → `pbiviz package` (builds the `.pbiviz`).

        -   `npm run lint` → runs ESLint on all `.ts`/`.js` files.
