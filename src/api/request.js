import axios from 'axios';
import { ElMessage } from 'element-plus';
import store from '../store';
import router from '../router';

const service = axios.create({
    baseURL: 'http://localhost:8888', // 后端API地址
    timeout: 5000000,
    withCredentials: true // 允许跨域请求携带cookie
});

// 请求拦截器
service.interceptors.request.use(
    config => {
        const token = store.state.token;
        const roles = store.state.roles;
        if (token && roles) {
            config.headers['Authorization'] = `Bearer ${token}`;
            config.headers['Roles'] = `${roles}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 响应拦截器
service.interceptors.response.use(
    response => {
        debugger;
        const res = response.data;
        if(response.status === 200){
            return res;
        }
        if(response.status === 206){
            return response;
        }
        if (res.code !== 200) {
            if(res.code === 401){
                store.dispatch('logout'); // 清除用户状态（例如 token）
                router.push({ name: 'Login' });
            }
            else if(res.code === 500){
                return res;
            }
            else if(res.code === 501){
                return res;
            }
            else if(res.code === 404){
                return res;
            }
            else{
                ElMessage.error(res.message || 'Error');
                return Promise.reject(new Error(res.message || 'Error'));
            }
        } else {
            return res;
        }
    },
    error => {
        ElMessage.error(error.message);
        if (error.response && error.response.status === 401) {
            // 如果 HTTP 状态码是 401，重定向到登录页面
            store.dispatch('logout'); // 清除用户状态（例如 token）
            router.push({ name: 'Login' });
        }
        return Promise.reject(error);
    }
);

export default service;
