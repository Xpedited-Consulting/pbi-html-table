import powerbi from "powerbi-visuals-api";
import { interactivityBaseService, interactivitySelectionService, baseBehavior } from "powerbi-visuals-utils-interactivityutils";
import { select, Selection } from "d3-selection";

export interface BaseBehaviorOptions<SelectableDataPointType extends interactivityBaseService.BaseDataPoint> extends interactivityBaseService.IBehaviorOptions<SelectableDataPointType> {

/** d3 selection object of the main elements on the chart */
elementsSelection: Selection<any, interactivitySelectionService.SelectableDataPoint, any, any>;

/** d3 selection object of some elements on backgroup, to hadle click of reset selection */
clearCatcherSelection: d3.Selection<any, any, any, any>;
}

export interface VisualDataPoint extends interactivitySelectionService.SelectableDataPoint {
    value: powerbi.PrimitiveValue;
}

export class Behavior extends baseBehavior.BaseBehavior<VisualDataPoint> {

    override bindEvents(options: baseBehavior.BaseBehaviorOptions<VisualDataPoint>, selectionHandler: interactivityBaseService.ISelectionHandler): void {
        this.options = options;
        this.selectionHandler = selectionHandler;
        
        this.bindClick();
        this.bindClearCatcher();
        this.bindContextMenu();
    }

  protected override bindClick(): void {
    const {
        elementsSelection
    } = this.options;
  
    elementsSelection.on("click", (datum) => {
        const mouseEvent: MouseEvent = window.event as MouseEvent;
        mouseEvent && this.selectionHandler.handleSelection(
            datum,
            mouseEvent.ctrlKey);
    });
  }

  protected override bindContextMenu() {
        const {
            elementsSelection
        } = this.options;

        elementsSelection.on("contextmenu", (datum) => {
            const event: MouseEvent = window.event as MouseEvent;
            if (event) {
                this.selectionHandler.handleContextMenu(
                    datum,
                    {
                        x: event.clientX,
                        y: event.clientY
                    });
                event.preventDefault();
            }
        });
    }
}