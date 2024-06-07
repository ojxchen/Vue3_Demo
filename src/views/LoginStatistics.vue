<template>
  <div
      ref="myChart"
      id="myChart"
      :style="{ width: '1200px', height: '600px' }"
  ></div>
</template>

<script>
import { getCurrentInstance, onMounted } from 'vue';
import request from "@/api/request";

export default {
  setup() {
    // 通过 internalInstance.appContext.config.globalProperties 获取全局属性或方法
    let internalInstance = getCurrentInstance();
    let echarts = internalInstance.appContext.config.globalProperties.$echarts;

    const getLoginStatistic = () =>{
      const dom = document.getElementById('myChart');
      const myChart = echarts.init(dom); // 初始化echarts实例
      request.post('/auth/getLoginStatistics').then(response => {
        if(response.code === 200){
          const data = response.data;
          const dates = data.map(item => item.date);
          const counts = data.map(item => item.count);
          const option = {
            tooltip: {
              trigger: 'axis',
            },
            legend: {},
            xAxis: {
              type: 'category',
              data: dates,
              name:'日期'
            },
            yAxis: {
              type: 'value',
              name: '访问次数',
              data: counts
            },
            series: [
              {
                data: counts,
                type: 'line',
              }
            ]
          };
          // 设置实例参数
          myChart.setOption(option);
        }
      })
    }


    onMounted(() => {
      getLoginStatistic()
    });
    return {
      getLoginStatistic
    };
  }
};
</script>

