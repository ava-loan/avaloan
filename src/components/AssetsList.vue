<template>
  <div class="list"> 
    <div class="elements">
      <table id="assetsTable">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Price</th>
            <th></th>
            <th>Balance</th>
            <th>Share</th>
            <th>Value</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr class="total-value">
            <td v-if="!isMobile"><b>Total</b></td>
            <td v-if="!isMobile" />
            <td v-if="!isMobile" />
            <td v-if="!isMobile" />
            <td v-if="!isMobile" />
            <td data-label="Total"><b>{{ toUSD(totalValue) | usd }}</b></td>
          </tr>  
          <tr v-for="asset in assetList" 
            v-bind:key="asset.symbol" 
            @click="rowClicked(asset)" 
            :class="{'clickable': asset.showAddInput || asset.showChart}">
            <td data-label="Asset">
              <div class="token-logo-wrapper">
                <img :src="`https://cdn.redstone.finance/symbols/${asset.symbol.toLowerCase()}.svg`" class="token-logo"/>
              </div>  
              <span class="token-name">{{ asset.name }}</span>
              </td>
            <td data-label="Price">{{ toUSD(asset.price) | usd }}</td>
            <td class="chart-icon" v-if="!isMobile" @click.stop="toggleChart(asset)">
              <SimpleChart 
                :dataPoints="asset.prices" 
                :lineWidth="1"/>
            </td>
            <td data-label="Balance">{{ asset.balance | units}}</td>
            <td data-label="Share">{{ asset.share | percent }}</td>
            <td data-label="Value">{{ toUSD(asset.value) | usd }}</td>
            <td class="invest-buttons" @click.stop>
              <img v-if="!asset.native" @click="toggleChangeAsset(asset)" src="src/assets/icons/transfer.svg"/>
            </td>
            <td class="input" v-if="asset.showAddInput" @click.stop>
              <CurrencyInput 
              label="Add" 
              :symbol="asset.symbol"
              :price="asset.price"
              :hasSecondButton="true" 
              secondLabel="Withdraw" 
              v-on:submitValue="({ value, first }) => changeAssetAmount(asset.symbol, value, asset.decimals, first)" 
              flexDirection="row" />
            </td>
            <td class="chart" v-if="(asset.showChart || isMobile) && asset.prices" @click.stop>
              <Chart 
              :dataPoints="asset.prices" 
              :minY="asset.minPrice" :maxY="asset.maxPrice" :lineWidth="2"/>
            </td>
          </tr>
        </tbody>
      </table>
    </div>  
  </div>
</template>


<script>
  import Chart from "@/components/Chart.vue";
  import SimpleChart from "@/components/SimpleChart.vue";
  import Block from "@/components/Block.vue";
  import CurrencyInput from "@/components/CurrencyInput.vue";
  import { mapState, mapActions } from "vuex";
  import redstone from 'redstone-api';


  export default {
    name: 'AssetsList',
    components: {
      Chart,
      Block,
      CurrencyInput,
      SimpleChart
    },
    props: {
      title: String,
      assets: [],
      fields: [
        'Asset',
        'Price', 
        'Balance', 
        'Value',
        'Share',
        { key: 'actions', label: ''}
      ],
    },
    computed: {
      ...mapState('loan', ['totalValue']),
    },
    data() {
      return {
        assetList: [],
        minimumValue: 0,
        maximumValue: 0
      }
    },
    async mounted () {
    },
    methods: {
      ...mapActions('loan', ['invest', 'redeem']),
      toggleChart(asset) {
        asset.showChart = !(asset.showChart === true);
        this.assetList = [...this.assetList]
      },
      toggleChangeAsset(asset) {
        asset.showAddInput = !asset.showAddInput;
        this.assetList = [...this.assetList]
      },
      rowClicked(asset) {
        asset.showRemoveInput = false;
        asset.showAddInput = false;
        asset.showChart = false;
        this.assetList = [...this.assetList]
      },
      chartPoints(points) {
        if (points == null || points.length == 0) {
          return [];
        }
        
        let maxValue = 0;
        let minValue = points[0].value;

        //test
        let dataPoints = points.map(
          item => {
            if (item.value > maxValue) maxValue = item.value;
            
            if (item.value < minValue) minValue = item.value;

            return {
              x: item.timestamp,
              y: item.value
            }
          }
        );

        return [dataPoints, minValue, maxValue ];
      },
      changeAssetAmount(asset, value, decimals, add) {
        if (add) {
          this.invest({ asset: asset, decimals: decimals, amount: value});
        } else {
          this.redeem({ asset: asset, decimals: decimals, amount: value});
        }
      },
      async updateAssets(list) {
        let newList = await Promise.all(list.map(
          async (asset) => {
    
            const priceResponse = await redstone.getHistoricalPrice(asset.symbol, {
              startDate: Date.now() - 3600 * 1000,
              interval: 1,
              endDate: Date.now()
            })

            const [ prices, minPrice, maxPrice ] = this.chartPoints(
              priceResponse
            );

            asset.prices = prices;
            asset.minPrice = minPrice;
            asset.maxPrice = maxPrice;

            return asset;
          }
        ));

        this.assetList = newList;
      },
      share(asset) {
        return asset.price * asset.balance;
      }
    },
    watch: {
      assets: {
        immediate: true,
        handler(newVal) {
          this.updateAssets(newVal);
        }
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

.list {
  width: 100%;
}

.element {
  padding: 16px 0;
  border-style: solid;
  border-width: 2px 0 0 0;
  border-image-source: linear-gradient(91deg, rgba(223, 224, 255, 0.43), rgba(255, 225, 194, 0.62), rgba(255, 211, 224, 0.79)); 
  border-image-slice: 1;
  font-weight: 500;

  .row {
    display: flex;
    justify-content: space-between;
  }
}

.title {
  color: #696969;
  font-weight: 500;
  margin-bottom: 16px;
}

.chart-icon {
  cursor: pointer;
  text-align: right;
  margin-right: 15px;

  img {
    height: 30px;
  }
}

.invest-buttons {
  display: flex;
  justify-content: space-around;

  img {
    height: 32px;
    cursor: pointer;
    opacity: 0.7;
    transition: transform .4s ease-in-out;  

    @media screen and (max-width: $md) {
      height: 44px;
    }

    &:hover {
      opacity: 1;
      transform: scale(1.05);
    }
  }
}

.clickable {
  cursor: pointer;
}

#assetsTable {
  width: 100%;

  th {
    text-align: left;
  }
}

.token-logo {
  height: 20px;

  @media screen and (max-width: $md) {
    height: 24px;
  }
}

.token-logo-wrapper {
  display: inline-block;
  width: 30px;
}

.token-name {
  font-weight: 500;
}

tr {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

td {
  display: flex;
  align-items: center;
}

thead tr {
  margin-bottom: 1rem;;
}

tbody tr {
  border-style: solid;
  border-width: 2px 0 0 0;
  border-image-source: linear-gradient(91deg, rgba(223, 224, 255, 0.43), rgba(255, 225, 194, 0.62), rgba(255, 211, 224, 0.79)); 
  border-image-slice: 1;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.chart, .input {
   display: grid;
   grid-column: 1/-1;
   margin-top: 2rem;
   margin-bottom: 2rem;
}

.input {
  @media screen and (max-width: $md) {
    margin-top: 0;

    .currency-input-wrapper {
      margin-top: 1rem;      
    }
  }  
}

.total-value {
  font-size: 24px; 

  @media screen and (min-width: $md) {
    font-size: 16px; 
  }
}

@media screen and (max-width: $md) {
  table {
    border: 0;
  }

  table caption {
    font-size: 1.3em;
  }
  
  table thead {
    border: none;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
  
  table tr {
    border-width: 0px 0 3px 0;
    display: block;
    margin-bottom: 1.5em;
    margin-top: 0;
    padding-top: 0;
  }
  
  table td {
    border-bottom: 1px solid #ddd;
    display: block;
    font-size: .8em;
    text-align: right;
    padding: 0.5rem 0;
  }
  
  table td::before {
    content: attr(data-label);
    float: left;
    font-weight: bold;
  }
  
  table td:last-child {
    border-bottom: 0;
  }

  .chart-icon, .invest-buttons {
    display: inline-block;
    border-bottom: none;
    text-align: start;
  }

  .chart-icon {
    width: 30%;
  }

  .invest-buttons {
    width: 100%;
    text-align: center;

    @media screen and (min-width: $md) {
      width: 65%;
      text-align: start;
    }
  }

  .input {
    border: none;
  }
}
</style>

<style lang="scss">
@import "~@/styles/variables";

#assetsTable .currency-input-wrapper {
  width: 100%;
  flex-wrap: wrap;

  @media screen and (min-width: $md) {
    flex-wrap: nowrap;
  }

  .input-wrapper {
    height: 50px;
    width: 100%;
  }

  input {
    height: 30px;
    line-height: 30px;
    width: 60%;
  }

  img {
    height: 30px;
  }

  .symbol {
    font-size: 16px;
  }

  .btn {
    padding: 10px 20px;
    margin-left: 20px;
    font-size: 20px;
    font-size: 17px;
  }

  .value-wrapper .label {
    text-align: start;
  }
}
</style>
