<template>
  <div class="lists">
    <div class="list">
      <div class="elements">
        <div class="title">Your investments</div>
        <div class="total">
          <span class="total-value-wrapper">
            <span class="total-value">Total value: <span class="value">$ {{ avaxToUSD(totalValue).toFixed(2) || usd }}</span></span>
          </span>
        </div>
        <table id="investmentsTable">
          <thead>
            <tr>
              <th>Asset</th>
              <th class="right">Price</th>
              <th>Trend</th>
              <th class="right">Balance</th>
              <th class="right">Share</th>
              <th class="right">Value</th>
              <th>Buy/Sell</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in investments"
              v-bind:key="asset.symbol"
              @click="rowClicked(asset)"
              :class="{'clickable': asset.buyInput || asset.showChart}">
              <td data-label="Asset">
                <div class="token-logo-wrapper">
                  <img :src="`https://cdn.redstone.finance/symbols/${asset.symbol.toLowerCase()}.svg`" class="token-logo"/>
                </div>
                <span class="token-name">{{ asset.name }}</span>
                </td>
              <td class="right" data-label="Price">
                <LoadedValue :check="() => asset.price != null" :value="avaxToUSD(asset.price) | usd"></LoadedValue>
              </td>
              <td class="chart-icon" v-if="!isMobile">
                <SimpleChart
                  :dataPoints="asset.prices"
                  :lineWidth="1.5"/>
                <img @click.stop="toggleChart(asset.symbol)"
                     src="src/assets/icons/enlarge.svg"
                />
              </td>
              <td class="right" data-label="Balance"><LoadedValue :check="() => asset.balance" :value="asset.balance.toFixed(2)"></LoadedValue></td>
              <td class="right" data-label="Share"><LoadedValue :value="asset.share | percent"></LoadedValue></td>
              <td class="right" data-label="Value"><LoadedValue :value="avaxToUSD(asset.value) | usd"></LoadedValue>
              <td class="invest-buttons" @click.stop v-if="asset.symbol !== nativeToken">
                <img @click="showBuyInput(asset.symbol)" src="src/assets/icons/plus.svg" class="buy"/>
                <img src="src/assets/icons/slash-small.svg"/>
                <img @click="showSellInput(asset.symbol)" src="src/assets/icons/minus.svg" class="sell"/>
              </td>
              <td v-else class="center">-</td>
              <td class="asset-input" v-if="asset.buyInput" @click.stop>
                <SmallBlock
                  v-on:close="() => { asset.buyInput = false; }">
                  <CurrencyForm
                    label="Buy"
                    :symbol="asset.symbol"
                    :price="asset.price"
                    :hasSecondButton="true"
                    v-on:submitValue="(value) => investValue(asset.symbol, value)"
                    :waiting="waitingForInvest"
                    flexDirection="row"
                    :validators="investValidators(asset)"
                    :info="amountInfo(asset)"
                  />
                </SmallBlock>
              </td>
              <td class="asset-input" v-if="asset.sellInput" @click.stop>
                <SmallBlock
                  v-on:close="() => { asset.sellInput = false; }">
                  <CurrencyForm
                    label="Sell"
                    :symbol="asset.symbol"
                    :price="asset.price"
                    :hasSecondButton="true"
                    v-on:submitValue="(value) => redeemValue(asset.symbol, value)"
                    :waiting="waitingForRedeem"
                    flexDirection="row"
                    :validators="redeemValidators(asset)"
                    :info="amountInfo(asset)"
                  />
                </SmallBlock>
              </td>
              <td class="chart" v-if="(asset.showChart || isMobile) && asset.prices" @click.stop>
                <SmallBlock
                  v-on:close="() => { asset.showChart = false; }">
                  <Chart
                  :dataPoints="asset.prices"
                  :minY="asset.minPrice" :maxY="asset.maxPrice" lineWidth="3"/>
                </SmallBlock>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="list options" v-if="investmentOptions && investmentOptions.length > 0">
      <div class="elements">
        <div class="title">Investment possibilities</div>
        <table id="optionsTable">
          <thead>
          <tr>
            <th>Asset</th>
            <th class="right">Price</th>
            <th>Trend</th>
            <th></th>
            <th></th>
            <th></th>
            <th>Buy</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="asset in investmentOptions"
              v-bind:key="asset.symbol"
              @click="rowClicked(asset.symbol)"
              :class="{'clickable': asset.buyInput || asset.showChart}">
            <td data-label="Asset">
              <div class="token-logo-wrapper">
                <img :src="`https://cdn.redstone.finance/symbols/${asset.symbol.toLowerCase()}.svg`" class="token-logo"/>
              </div>
              <span class="token-name">{{ asset.name }}</span>
            </td>
            <td class="right" data-label="Price">
              <LoadedValue :check="() => asset.price != null" :value="avaxToUSD(asset.price) | usd"></LoadedValue>
            </td>
            <td class="chart-icon" v-if="!isMobile">
              <SimpleChart
                :dataPoints="asset.prices"
                :lineWidth="1.5"/>
              <img @click.stop="toggleChart(asset.symbol)" src="src/assets/icons/enlarge.svg"/>
            </td>
            <td data-label="Balance"></td>
            <td data-label="Share"></td>
            <td data-label="Value"></td>
            <td class="invest-buttons" @click.stop>
              <img v-if="asset.symbol !== nativeToken" @click="showBuyInput(asset.symbol)" src="src/assets/icons/plus.svg" class="buy"/>
            </td>
            <td class="asset-input" v-if="asset.buyInput" @click.stop>
              <SmallBlock
                v-on:close="() => { asset.buyInput = false;  }">
                <CurrencyForm
                  label="Buy"
                  :symbol="asset.symbol"
                  :price="asset.price"
                  :hasSecondButton="true"
                  v-on:submitValue="(value) => investValue(asset.symbol, value)"
                  :waiting="waitingForInvest"
                  flexDirection="row"
                  :validators="investValidators(asset)"
                  :info="amountInfo(asset)"
                />
              </SmallBlock>
            </td>
            <td class="chart" v-if="(asset.showChart || isMobile) && asset.prices" @click.stop>
              <SmallBlock
                v-on:close="() => { asset.showChart = false;  }">
                <Chart
                  :dataPoints="asset.prices"
                  :minY="asset.minPrice" :maxY="asset.maxPrice" :lineWidth="3"/>
              </SmallBlock>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>


<script>
  import Chart from "@/components/Chart.vue";
  import SimpleChart from "@/components/SimpleChart.vue";
  import Block from "@/components/Block.vue";
  import CurrencyForm from "@/components/CurrencyForm.vue";
  import SmallBlock from "@/components/SmallBlock.vue";
  import LoadedValue from "@/components/LoadedValue.vue";
  import { mapState, mapActions } from "vuex";
  import redstone from 'redstone-api';
  import Vue from 'vue'
  import config from "@/config";


  export default {
    name: 'AssetsList',
    components: {
      Chart,
      Block,
      CurrencyForm,
      SimpleChart,
      SmallBlock,
      LoadedValue
    },
    props: {
      fields: [
        'Asset',
        'Price',
        'Balance',
        'Value',
        'Share',
        { key: 'actions', label: ''}
      ]
    },
    computed: {
      ...mapState('loan', ['totalValue', 'assets']),
      investments() {
        return Object.values(this.list).filter(
          asset => {
            return asset.balance > 0 || asset.symbol === this.nativeToken
          }
        )
      },
      investmentOptions() {
        return Object.values(this.list).filter(
          asset => {
            return (!asset.balance || asset.balance === 0) && asset.symbol !== this.nativeToken
          }
        )
      },
      nativeToken() {
        return config.nativeToken;
      }
    },
    data() {
      return {
        list: config.ASSETS_CONFIG,
        waitingForInvest: false,
        waitingForRedeem: false
      }
    },
    methods: {
      ...mapActions('loan', ['invest', 'redeem']),
      investValidators(asset) {
        return [
          {
            require: value => this.list[this.nativeToken].balance * this.list[this.nativeToken].price
                                >= asset.price * value,
            message: 'Requested asset value exceeds your available AVAX balance'
          }
        ]
      },
      amountInfo(asset) {
        return (value) => `Amount in AVAX: <b>${(asset.price * value).toPrecision(2)}</b>`
      },
      redeemValidators(asset) {
       return [
         {
           require: value => asset.balance >= value,
           message: 'Requested amount exceeds your asset balance'
         }
       ]
      },
      toggleChart(symbol) {
        this.updateAsset(symbol, 'showChart', !this.list[symbol].showChart);
        this.updateAsset(symbol, 'buyInput', false);
        this.updateAsset(symbol, 'sellInput', false);
      },
      showBuyInput(symbol) {
        this.updateAsset(symbol, 'buyInput', true);
        this.updateAsset(symbol, 'sellInput', false);
        this.updateAsset(symbol, 'showChart', false);
      },
      showSellInput(symbol) {
        this.updateAsset(symbol, 'sellInput', true);
        this.updateAsset(symbol, 'buyInput', false);
        this.updateAsset(symbol, 'showChart', false);
      },
      investValue(symbol, value) {
        this.handleTransaction(this.invest,{ asset: symbol, decimals: this.list[symbol].decimals, amount: value}, "waitingForInvest")
          .then(() => {
            this.updateAsset(symbol, 'sellInput', false);
            this.updateAsset(symbol, 'buyInput', false);
            this.updateAsset(symbol, 'showChart', false);
          });
      },
      redeemValue(symbol, value) {
        this.handleTransaction(this.redeem,{ asset: symbol, decimals: this.list[symbol].decimals, amount: value}, "waitingForRedeem")
          .then(() => {
            this.updateAsset(symbol, 'sellInput', false);
            this.updateAsset(symbol, 'buyInput', false);
            this.updateAsset(symbol, 'showChart', false);
          });
      },
      rowClicked(symbol) {
        this.updateAsset(symbol, 'showRemoveInput', false);
        this.updateAsset(symbol, 'sellInput', false);
        this.updateAsset(symbol, 'buyInput', false);
        this.updateAsset(symbol, 'showChart', false);
      },
      updateAsset(symbol, key, value) {
        Vue.set(this.list[symbol], key, value);
      },
      chartPoints(points) {
        if (points == null || points.length === 0) {
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
      async updateAssets(list) {
        this.list = list;

        for (const symbol of Object.keys(list)) {
          const priceResponse = await redstone.getHistoricalPrice(symbol, {
            startDate: Date.now() - 3600 * 1000,
            interval: 1,
            endDate: Date.now()
          })

          const [prices, minPrice, maxPrice] = this.chartPoints(
            priceResponse
          );

          this.updateAsset(symbol, 'prices', prices);
          this.updateAsset(symbol, 'minPrice', minPrice);
          this.updateAsset(symbol, 'maxPrice', maxPrice);
        }
      },
      share(asset) {
        return asset.price * asset.balance;
      }
    },
    watch: {
      assets: {
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
  font-size: 24px;
  font-weight: bold;
  width: 100%;
  text-align: center;
}

.total {
  margin-top: 18px;
  width: 100%;
  text-align: center;

  .total-value-wrapper {
    background-image: linear-gradient(117deg, #dfe0ff 39%, #ffe1c2 62%, #ffd3e0 82%);
    border-radius: 25px;
    display: inline-block;
    height: 44px;
    padding: 12px 2px 2px;
  }

  .total-value {
    background: white;
    padding: 9px 20px;
    border-radius: 21px;
    font-size: 18px;

    .value {
      font-weight: 500;
    }
  }
}

.options {
  margin-top: 40px;
}

.chart-icon {
  text-align: right;
  margin-right: 15px;
  margin-left: 15px;

  img {
    height: 22px;
    margin-left: 5px;
    cursor: pointer;
  }
}

.invest-buttons {
  display: flex;
  justify-content: center;

  .buy, .sell {
    height: 20px;
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

#investmentsTable, #optionsTable {
  width: 100%;
  margin-top: 45px;

  th {
    text-align: center;
    color: #696969;
  }

  td {
    font-weight: 500;
  }

  .right {
    text-align: right;
    justify-content: flex-end;
  }

  .center {
    text-align: center;
    justify-content: center;
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

.chart, .asset-input {
   display: grid;
   grid-column: 1/-1;
   margin-top: 2rem;
   margin-bottom: 2rem;
   height: 180px;
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

  .asset-input {
    border: none;
  }
}

.chart-loader {
  display: flex;
  justify-content: center;
}
</style>

<style lang="scss">
@import "~@/styles/variables";

#investmentsTable, #optionsTable {
  .small-block-wrapper {
    height: 215px;
  }

  .currency-form-wrapper {
    width: 100%;
    flex-wrap: wrap;
    align-items: flex-start;
    margin-top: 42px;

    @media screen and (min-width: $md) {
      flex-wrap: nowrap;
    }

    .input-wrapper {
      height: 50px;
      width: 80%;
    }

    input {
      height: 30px;
      line-height: 30px;
      width: 60%;
    }

    .error, .info {
      text-align: left;
    }

    .logo {
      height: 30px;
    }

    .symbol {
      font-size: 16px;
    }

    .btn {
      padding: 10px 20px;
      margin-left: 20px;
      font-size: 17px;
      display: flex;
    }

    .value-wrapper .label {
      text-align: start;
    }
  }
}
</style>