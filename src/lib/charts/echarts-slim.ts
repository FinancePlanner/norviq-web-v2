// Port of norviq-web internal/server/assets/echarts-slim.js: the minimal
// ECharts bundle covering every chart the Go layer renders. Loaded only on the
// client, through loader.ts (a dynamic import, so it is its own chunk).
//
// Keep in sync with the builders: an unregistered chart type makes setOption
// throw and the container renders blank.
import * as echarts from 'echarts/core';
import { BarChart, CandlestickChart, GraphChart, HeatmapChart, LineChart, PieChart, TreemapChart } from 'echarts/charts';
import { CalendarComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
	LineChart,
	PieChart,
	BarChart,
	CandlestickChart,
	TreemapChart,
	GraphChart,
	// HeatmapChart + CalendarComponent + VisualMapComponent are a set: the
	// calendar supplies the coordinates and the visualMap the density ramp.
	HeatmapChart,
	GridComponent,
	TooltipComponent,
	LegendComponent,
	CalendarComponent,
	VisualMapComponent,
	CanvasRenderer
]);

export { echarts };
