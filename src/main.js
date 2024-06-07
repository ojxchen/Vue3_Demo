import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElIcons from '@element-plus/icons'
import Echarts from "vue-echarts"
import * as echarts from "echarts"


const app = createApp(App);
app.config.globalProperties.$echarts = echarts
app.use(router);
app.use(store);
app.use(ElementPlus);
app.use(ElIcons);
app.use(Echarts)
app.use(echarts)
app.mount('#app');

