<script>
  import { Line } from "vue-chartjs";

  export default {
    extends: Line,
    props: ['data'],
    watch: {
      data: function(chartData, oldVal) { // watch it
        console.log('Data changed: ', chartData, ' | was: ', oldVal);

        this.renderChart(
          {
            labels: chartData.labels,
            datasets: [
              {
                data: chartData.values,
                pointBackgroundColor: chartData.pointBackgrounds,
                backgroundColor: "transparent",
                borderColor: "#432B97",
                //pointBackgroundColor: "#B78ADB",
                pointRadius: 6,
                borderWidth: 2,
                pointBorderColor: "transparent"
              }
            ]
          },
          {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              xAxes: [{
                type: 'time',
                time: {
                  unit: 'day'
                }
              }]
            },
            legend: {
              display: false
            },
            tooltips: {
              callbacks: {
                label: function(tooltipItem, data) {
                  var label = data.datasets[tooltipItem.datasetIndex].label || '';

                  if (label) {
                    label += ': ';
                  }
                  label += Math.round(tooltipItem.yLabel * 100) / 100;
                  return label;
                }
              }
            },
          }
        );


      }
    }
  };
</script>
