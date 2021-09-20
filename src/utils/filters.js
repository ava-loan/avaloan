import Vue from 'vue'

export default function setupFilters() {

  Vue.filter("usd", function (value) {
    if (!value) return "$ 0";
    return "$ " + value.toFixed(2);
  });

  Vue.filter("usd-precise", function (value) {
    if (!value) return "$0";
    return "$" + value.toFixed(12);
  });

  Vue.filter("avax", function (value) {
    if (!value) return "0";
    return value.toFixed(2);
  });

  Vue.filter("full", function (value, avaxPrice) {
    if (!value) return "";
    let usd = value * avaxPrice;
    return value.toFixed(2) + " AVAX ($" + usd.toFixed(2) + ")";
  });

  Vue.filter("units", function (value) {
    if (!value) return "0";
    return value.toFixed(3);
  });

  Vue.filter("percent", function (value) {
    if (!value) return "0%";
    return (value * 100).toFixed(2) + "%";
  });

  Vue.filter("tx", function (value) {
    if (!value) return "";
    return value.substr(0, 6) + "..." + value.substr(value.length - 4);
  });

  Vue.filter("date", function (value) {
    let interval = new Date().getTime() - value;

    const milisecondsInDay = 1000 * 60 * 60 * 24;
    const milisecondsInHour = 1000 * 60 * 60;
    const milisecondsInMinute = 1000 * 60;
    const milisecondsInSecond = 1000;

    const days = Math.max(0, parseInt(interval / milisecondsInDay));
    interval = interval - days * milisecondsInDay;
    const hours = Math.max(0, parseInt(interval / milisecondsInHour));
    interval = interval - hours * milisecondsInHour;
    const minutes = Math.max(0, parseInt(interval / milisecondsInMinute));
    interval = interval - minutes * milisecondsInMinute;
    const seconds = Math.max(0, parseInt(interval / milisecondsInSecond));
    interval = interval - seconds * milisecondsInSecond;

    let result = "";
    if (days > 0) result += days + (days == 1 ? " day" : " days")
    if (hours > 0) result +=  " " + hours + " h";
    if (minutes > 0 && days == 0) result +=  " " + minutes + " min";
    if (seconds > 0 && days == 0 && hours == 0) result += " " + seconds + " s";

    result += " ago";

    return result;
  });
}
