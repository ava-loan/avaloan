<script>
  import Chart from 'chart.js'
  import { generateChart } from 'vue-chartjs'

  Chart.defaults.LineWithLine = Chart.defaults.line;
  Chart.controllers.LineWithLine = Chart.controllers.line.extend({
    draw: function(ease) {
      Chart.controllers.line.prototype.draw.call(this, ease);

      if (this.chart.tooltip._active && this.chart.tooltip._active.length) {
        var activePoint = this.chart.tooltip._active[0],
        ctx = this.chart.ctx,
        x = activePoint.tooltipPosition().x,
        y = activePoint.tooltipPosition().y,
        topY = this.chart.scales['y-axis-0'].top,
        bottomY = this.chart.scales['y-axis-0'].bottom;

         // draw line
         ctx.save();
         ctx.beginPath();
         ctx.moveTo(x, topY);
         ctx.lineTo(x, bottomY);
         ctx.lineWidth = 1;
         ctx.strokeStyle = '#b9b7ff';
         ctx.stroke();

        // draw point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#6b70ed';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        ctx.fill();   


         ctx.restore();
      }
   }
  })

  const CustomLine = generateChart('custom-line', 'LineWithLine')
  
  export default {
    name: 'Chart',
    extends: CustomLine,
    props: {
      dataPoints: {
        type: Array,
        default: () => [],
      },
      minY: 0,
      maxY: null,
      height: null,
      width: null,
      lineWidth: null,
      stepped: 'none',
      onlyLine: false
    },
    data() {
      return {
        gradient: null
      }
    },
    mounted () {
      this.renderChart(this.chartData, this.options)
    },
    computed: {
      minX() {
        return this.dataPoints[0].x;
      },
      maxX() {
        return this.dataPoints.slice(-1)[0].x;
      },
      chartData() {
        return {
          datasets: [
            {
              fill: false,
              steppedLine: this.stepped,
              data: this.dataPoints,
              borderColor: (context) => this.borderColor(context),
              borderWidth: this.lineWidth
            }
          ]
        };
      },
      options() {
        return {
          aspectRatio: this.isMobile ? 2 : 4, 
          height: null,
          width: null,
          legend: {
            display: false
          },
          elements: {
            point:{
              radius: 0
            }
          },
          scales: {
            xAxes: [{
              display: false,
              type: 'time',
              gridLines: {
                  drawOnChartArea: false
              },
              ticks: {
                display: false,
                beginAtZero: false,
                min: this.minX - (this.maxX - this.minX) / 50,
                max: this.maxX + (this.maxX - this.minX) / 50
              }
            }],
            yAxes: [{
              gridLines: {
                zeroLineWidth: this.onlyLine ? 0 : 0.5,
                borderDash: [8, 4],
                drawOnChartArea: !this.onlyLine,
                tickMarkLength: 0,
                drawBorder: false,
              },
              ticks: {
                display: !this.onlyLine,
                maxTicksLimit: 1,
                min: this.minY,
                max: this.maxY,
                fontFamily: 'Montserrat',
                padding: 10,
              }
            }]
          } ,
          tooltips: {
            enabled: !this.onlyLine,
            intersect: false, 
            mode: "index",
            backgroundColor: '#6b70ed',
            titleFontFamily: 'Montserrat',
            bodyFontFamily: 'Montserrat',
            displayColors: false,
            callbacks: {
              label: function(tooltipItem, data) {
                var label = data.datasets[tooltipItem.datasetIndex].label || '';

                if (label) {
                  label += ': ';
                }
                label += (Math.round(tooltipItem.yLabel * 100) / 100).toLocaleString('en-US');
                return label + ' AVAX';
              }
            }
          }   
        }
      }
    },
    watch: {
      dataPoints() {
        this.renderChart(this.chartData, this.options);
      },
      options() {
        this.renderChart(this.chartData, this.options);
      }
    },
    methods: {
      getGradient(ctx, chartArea) {
        if (this.gradient === null) {

          let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
          gradient.addColorStop(0.5, 'rgba(255, 216, 177, 0.8)');
          gradient.addColorStop(1, 'rgba(0, 128, 0, 0.6)');

          return gradient;
        }
      },
      borderColor(context) {
        const chart = context.chart;
        const {ctx, chartArea} = chart;

        if (!chartArea) {
          // This case happens on initial chart load
          return null;
        }

        return this.getGradient(ctx, chartArea);
      }
    }
  }
</script>

<style lang="scss" scoped>
canvas {
  width: 100% !important;
  height: unset !important;
}
</style>

