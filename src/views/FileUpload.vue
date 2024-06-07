<template>
  <el-card class="box-card">
    <div class="drag-area" @drop.prevent="handleDrop" @dragover.prevent>
      <el-upload
          ref="upload"
          :file-list="fileList"
          :http-request="uploadFile"
          :on-progress="handleProgress"
          class="upload-demo"
          drag
          multiple
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      </el-upload>
    </div>
    <el-progress v-if="uploading" :percentage="uploadPercentage"></el-progress>
    <el-table :data="uploadedFiles" style="width: 100%">
      <el-table-column label="文件名" prop="name"></el-table-column>
      <el-table-column label="大小" prop="size"></el-table-column>
      <el-table-column label="操作">
        <template v-slot="scope">
          <el-button type="text" @click="downloadFile(scope.row)">下载</el-button>
          <el-button type="text" @click="deleteFile(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import {ref, onMounted, onBeforeUnmount} from 'vue';
import request from "@/api/request";
import {ElMessage} from 'element-plus';
import SparkMD5 from 'spark-md5'
// import md5Worker from 'worker-loader!@/workers/md5Worker.js'


export default {
  name: 'FileUpload',
  setup() {
    const fileList = ref([]);
    const uploading = ref(false);
    const uploadPercentage = ref(0);
    const uploadedFiles = ref([]);
    // 在组件中声明一个变量用来标记组件是否已销毁
    let isComponentDestroyed = false;

    /**
     * 查找文件列表
     * @returns {Promise<void>}
     */
    const fetchUploadedFiles = async () => {
      try {
        const response = await request.get('/api/files');
        const filteredFiles = response.data.filter(file => file.name.indexOf('.part') === -1);  //过滤掉包含part文件
        uploadedFiles.value = filteredFiles;
      } catch (error) {
        ElMessage.error("文件查找失败")
      }
    };

    /**
     * 设置md5
     * @param file
     * @returns {Promise<unknown>}
     */
    async function calculateMd5(file) {
      return new Promise((resolve, reject) => {
        const largeFileSizeThreshold = 60 * 1024 * 1024; // 大文件阈值，例如 60MB
        if (file.size > largeFileSizeThreshold) {
          // 如果文件大于阈值，计算开头、中间和结尾各10MB内容的MD5
          const chunkSize = 10 * 1024 * 1024; // 10MB
          const spark = new SparkMD5.ArrayBuffer();
          const fileReader = new FileReader();

          let start1 = 0;
          let end1 = Math.min(chunkSize, file.size);
          let start2 = Math.floor(file.size / 2) - Math.floor(chunkSize / 2);
          let end2 = start2 + chunkSize;
          let start3 = file.size - chunkSize;
          let end3 = file.size;

          let remainingChunks = 3; // 开头、中间、结尾各需要计算一个10MB的块
          const loadNext = (start, end) => {
            fileReader.readAsArrayBuffer(file.slice(start, end));
          };
          fileReader.onload = (e) => {
            spark.append(e.target.result);
            remainingChunks--;

            if (remainingChunks === 2) {
              loadNext(start2, end2); // 继续加载中间10MB的块
            } else if (remainingChunks === 1) {
              loadNext(start3, end3); // 继续加载结尾10MB的块
            } else {
              resolve(spark.end()); // 完成MD5计算
            }
          };
          fileReader.onerror = () => {
            reject('文件读取错误');
          };

          // 读取开头10MB内容
          loadNext(start1, end1);
        } else {
          const spark = new SparkMD5.ArrayBuffer();
          const fileReader = new FileReader();
          const loadNext = (start, end) => {
            fileReader.readAsArrayBuffer(file.slice(start, end));
          };
          fileReader.onload = (e) => {
            spark.append(e.target.result);
            resolve(spark.end()); // 完成MD5计算
          };
          fileReader.onerror = () => {
            reject('文件读取错误');
          };
          loadNext(0, file.size);
        }
      });
    }

    /**
     * 文件分块上传或续传或秒传
     */
    const CHUNK_SIZE = 200 * 1024 * 1024;
    const uploadFile = async ({file}) => {
      uploading.value = true;  //进度条
      uploadPercentage.value = 0; //进度条初始值
      let code = 0;
      const fileMd5 = await calculateMd5(file);
      let response = await request.get(`/api/check-file`, {
        params: {
          md5: fileMd5,
          fileSize: file.size
        }
      });
      uploadPercentage.value = Math.round((response.data.startByte) * 100 / file.size);
      if (response.data.exists && response.data.complete) {
        uploading.value = false;
        ElMessage.success("文件上传成功");
        fetchUploadedFiles();
        return;
      }

      let startByte = response.data.startByte || 0;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE); //分块 向上取整

      for (let chunkIndex = Math.floor(startByte / CHUNK_SIZE); chunkIndex < totalChunks; chunkIndex++) {  // 分块循环
        if(isComponentDestroyed){
          break;
        }
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);  //取较小 分块
        const chunk = file.slice(start, end);  //取文件数据的范围
        const formData = new FormData();
        formData.append('file', chunk);  //分块数据
        formData.append('md5', fileMd5); // MD5
        formData.append('chunkIndex', chunkIndex); // 分块索引
        formData.append('totalChunks', totalChunks); //总分块数
        formData.append('fileSize', file.size); //文件大小
        formData.append('fileName', file.name); // 添加文件名参数

        try {
          response = await request.post('/api/upload', formData, {
            onUploadProgress: (progressEvent) => {
              if (chunkIndex === totalChunks - 1) {
                uploadPercentage.value = 99;
              } else {
                uploadPercentage.value = Math.round((chunkIndex * CHUNK_SIZE + progressEvent.loaded) * 100 / file.size);  //进度条 四舍五入
              }
            }
          });

          code = response.code;
          if (response.code !== 200) {
            ElMessage.error(response.message);
            break;
          }
        } catch (error) {
          ElMessage.error("文件上传失败");
          break;
        }
      }

      if (uploadPercentage.value === 99 && code === 200) {
        uploadPercentage.value = 100;
        ElMessage.success('文件上传成功');
        fetchUploadedFiles();
      }

      uploading.value = false;
    };

    /**
     * 文件下载
     * @param file
     * @returns {Promise<void>}
     */
    const downloadFile = async (file) => {
      uploading.value = true;  // 进度条
      uploadPercentage.value = 0; // 进度条初始值
      try {
        let startByte = 0;
        const chunkSize = 20 * 1024 * 1024; // 每次下载10000字节
        let endByte = chunkSize - 1;
        let totalSize = 0;
        let downloadedData = [];
        // 获取文件总大小
        const headResponse = await request.get(`/api/download/${file.name}`, {
          headers: {
            Range: 'bytes=0-0' // 只请求文件的第一个字节
          }
        });

        // 获取 'Content-Range' 响应头来确定文件大小
        const contentRange = headResponse.headers['content-range'];
        if (contentRange) {
          totalSize = parseInt(contentRange.split('/')[1], 10);
        } else {
          console.error('Failed to retrieve file size');
          uploading.value = false;
          return;
        }

        while (startByte < totalSize) {
          const response = await request.get(`/api/download/${file.name}`, {
            responseType: 'blob',
            headers: {
              Range: `bytes=${startByte}-${endByte}`
            },
            onDownloadProgress: progressEvent => {
              const percentCompleted = Math.round((startByte + progressEvent.loaded) * 100 / totalSize);
              uploadPercentage.value = percentCompleted;
            }
          });

          downloadedData.push(response.data);

          // 更新下一次请求的范围
          startByte = endByte + 1;
          endByte = startByte + chunkSize - 1;

          // 如果已经下载完整个文件，调整endByte
          if (endByte >= totalSize) {
            endByte = totalSize - 1;
          }
        }

        // 合并所有的 Blob 数据
        const blob = new Blob(downloadedData);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);

        uploading.value = false;
        ElMessage.success('文件下载成功');
      } catch (error) {
        uploading.value = false;
        ElMessage.error('文件下载失败');
        console.log(error);
      }
    };

    /**
     * 拖拽上传文件
     * @param event
     */
    const handleDrop = (event) => {
      const files = event.dataTransfer.files;
      Array.from(files).forEach(file => {
        uploadFile({file});
      });
    };

    /**
     * 删除文件
     * @param file
     * @returns {Promise<void>}
     */
    const deleteFile = async (file) => {
      try {
        const response = await request.delete(`/api/delete/${file.name}`);
        if (response.code === 200) {
          fetchUploadedFiles();
        } else {
          ElMessage.error(response.message);
        }
      } catch (error) {
        ElMessage.error("文件删除失败");
      }
    };

    // 在组件销毁前清除循环操作
    onBeforeUnmount(() => {
      isComponentDestroyed = true;
    });

    // 钩子函数  查找文件列表
    onMounted(() => {
      fetchUploadedFiles();
    });

    return {
      fileList,
      uploading,
      uploadPercentage,
      uploadedFiles,
      uploadFile,
      handleDrop,
      deleteFile,
      downloadFile,
    };
  },
};
</script>



