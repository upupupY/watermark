let fileInput = document.getElementById('file');
// canvas元素
let canvas = document.getElementById('pre-image');
let info = document.getElementById('info');

// 设置水印
let waterSet = document.getElementById('waterSet');


const btn = document.getElementById('btn');
const clear = document.getElementById('clear');
const download = document.getElementById('download')

if(canvas.getContext){
  const ctx = canvas.getContext('2d');
  const waterSetCtx = waterSet.getContext('2d');
  
  // 获取控制元素
  const watermarkText = document.getElementById('watermarkText');
  const watermarkColor = document.getElementById('watermarkColor');
  const watermarkOpacity = document.getElementById('watermarkOpacity');
  const watermarkRotation = document.getElementById('watermarkRotation');
  const watermarkSize = document.getElementById('watermarkSize');
  const watermarkFont = document.getElementById('watermarkFont');
  const opacityValue = document.getElementById('opacityValue');
  const rotationValue = document.getElementById('rotationValue');
  const sizeValue = document.getElementById('sizeValue');
  const exportQuality = document.getElementById('exportQuality');
  
  // 存储所有待处理的图片
  let imageQueue = [];
  let originalImage = null;
  
  // 水印设置
  let textStr = watermarkText.value || '仅用于面试';
  
  // 更新显示值
  watermarkOpacity.addEventListener('input', function() {
    opacityValue.textContent = this.value + '%';
  });
  
  watermarkRotation.addEventListener('input', function() {
    rotationValue.textContent = this.value + '°';
  });

  watermarkSize.addEventListener('input', function() {
    sizeValue.textContent = this.value + 'px';
  });

  // 监听所有水印属性变化
  [watermarkText, watermarkColor, watermarkOpacity, watermarkRotation, watermarkSize, watermarkFont].forEach(element => {
    element.addEventListener('input', function() {
      if (element === watermarkText) {
        textStr = this.value || '仅用于面试';
      }
      updateWatermark();
      
      // 如果已经有图片，重新添加水印
      if (originalImage) {
        redrawImage();
      }
    });
  });

  // 重新设置水印画布
  function updateWatermark() {
    const text = textStr;
    const color = watermarkColor.value;
    const opacity = watermarkOpacity.value / 100;
    const rotation = watermarkRotation.value;
    const fontSize = watermarkSize.value;
    const fontFamily = watermarkFont.value;

    waterSetCtx.font = `${fontSize}px ${fontFamily}`;
    waterSetCtx.textAlign = "center";
    
    // 计算文本宽度
    const metrics = waterSetCtx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize; // 使用字体大小作为文本高度
    
    // 设置画布大小以适应旋转后的文本
    const diagonal = Math.sqrt(textWidth * textWidth + textHeight * textHeight);
    waterSet.width = diagonal + 40;
    waterSet.height = diagonal + 40;
    
    // 重新设置上下文属性（因为画布重置会清除设置）
    waterSetCtx.font = `${fontSize}px ${fontFamily}`;
    waterSetCtx.textAlign = "center";
    
    // 移动到中心点并旋转
    waterSetCtx.translate(waterSet.width/2, waterSet.height/2);
    waterSetCtx.rotate(rotation * Math.PI / 180);
    
    // 设置颜色和透明度
    waterSetCtx.fillStyle = color;
    waterSetCtx.globalAlpha = opacity;
    
    // 绘制文本
    waterSetCtx.fillText(text, 0, textHeight/3); // 调整垂直位置以更好地居中
    
    // 重置变换
    waterSetCtx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // 重新绘制图片和水印
  function redrawImage() {
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    applyWatermark();
  }

  // 应用水印
  function applyWatermark() {
    // 计算水印行列数
    const n = Math.ceil(canvas.width / (waterSet.width - 20));
    const m = Math.ceil(canvas.height / (waterSet.height - 20));
    
    // 添加水印
    for(let i = 0; i < n; i++){
      for(let j = 0; j < m; j++){
        ctx.drawImage(
          waterSet, 
          i * (waterSet.width - 20), 
          j * (waterSet.height - 20)
        );
      }
    }
  }

  // 修改清除水印函数
  function restoreOriginalImage() {
    if (!imageQueue.length) {
      alert('请先选择图片');
      return;
    }

    // 清除当前预览图片的水印
    if (originalImage) {
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    }
  }

  updateWatermark();

  // 处理单个图片的Promise
  function processImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = function() {
          // 设置画布尺寸为图片原始尺寸
          canvas.width = img.width;
          canvas.height = img.height;
          
          // 绘制原图
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // 添加水印
          applyWatermark();
          
          // 导出图片
          const quality = parseFloat(exportQuality.value);
          canvas.toBlob(function(blob) {
            resolve({
              blob,
              fileName: `watermark_${file.name.split('.')[0]}.${quality === 1 ? 'png' : 'jpg'}`
            });
          }, quality === 1 ? 'image/png' : 'image/jpeg', quality);
        };
        
        img.onerror = reject;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  // 添加预览相关变量
  let currentPreviewIndex = 0;
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const previewCounter = document.getElementById('preview-counter');

  // 修改预览图片函数
  async function previewImage(index) {
    if (!imageQueue.length) return;
    
    currentPreviewIndex = index;
    const file = imageQueue[index];
    
    // 更新计数器
    previewCounter.textContent = `${index + 1}/${imageQueue.length}`;
    
    // 更新导航按钮状态
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === imageQueue.length - 1;
    
    // 添加过渡效果类
    canvas.classList.add('transitioning');
    
    // 读取并显示图片
    try {
      const reader = new FileReader();
      reader.onload = function(e) {
        originalImage = new Image();
        originalImage.src = e.target.result;
        originalImage.onload = function() {
          canvas.width = originalImage.width;
          canvas.height = originalImage.height;
          
          const scale = Math.min(800 / originalImage.width, 600 / originalImage.height);
          canvas.style.width = originalImage.width * scale + 'px';
          canvas.style.height = originalImage.height * scale + 'px';
          
          redrawImage();
          
          // 移除过渡效果类
          setTimeout(() => {
            canvas.classList.remove('transitioning');
          }, 300);
        };
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('预览图片失败:', error);
      canvas.classList.remove('transitioning');
    }
  }

  // 导航按钮事件监听
  prevBtn.addEventListener('click', () => {
    if (currentPreviewIndex > 0) {
      previewImage(currentPreviewIndex - 1);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentPreviewIndex < imageQueue.length - 1) {
      previewImage(currentPreviewIndex + 1);
    }
  });

  // 添加拖拽上传相关代码
  const dropZone = document.getElementById('dropZone');

  // 阻止默认拖拽行为
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  // 添加拖拽视觉反馈
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight(e) {
    dropZone.classList.add('drag-over');
  }

  function unhighlight(e) {
    dropZone.classList.remove('drag-over');
  }

  // 处理拖拽上传
  dropZone.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }

  // 统一处理文件的函数
  function handleFiles(files) {
    if (!files.length) return;

    // 过滤出图片文件
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      alert('请选择图片文件');
      return;
    }

    imageQueue = imageFiles;
    
    if (imageFiles.length > 1) {
      // 显示导航按钮
      prevBtn.style.display = 'block';
      nextBtn.style.display = 'block';
      previewCounter.style.display = 'block';
    } else {
      // 隐藏导航按钮
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      previewCounter.style.display = 'none';
    }

    // 预览第一张图片
    previewImage(0);
  }

  // 修改文件选择事件处理
  fileInput.addEventListener('change', function() {
    handleFiles(this.files);
  });

  // 添加点击上传区域触发文件选择
  dropZone.addEventListener('click', function(e) {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  // 修改下载按钮事件处理
  download.addEventListener('click', function() {
    if (!imageQueue.length) {
      alert('请先选择图片');
      return;
    }
    
    if (imageQueue.length > 1) {
      processBatch(imageQueue);
    } else {
      // 单张图片处理保持原来的逻辑
      const quality = parseFloat(exportQuality.value);
      canvas.toBlob(function(blob) {
        const fileName = imageQueue[0].name;
        const extension = quality === 1 ? 'png' : 'jpg';
        saveAs(blob, `watermark_${fileName.split('.')[0]}.${extension}`);
      }, quality === 1 ? 'image/png' : 'image/jpeg', quality);
    }
  });

  // 修改一键水印按钮事件处理
  btn.addEventListener('click', function(){
    if (!imageQueue.length) {
      alert('请先选择图片');
      return;
    }
    
    // 如果是多图模式，处理当前预览的图片
    if (imageQueue.length > 1) {
      previewImage(currentPreviewIndex);
    } else {
      redrawImage();
    }
  });

  // 添加清除水印按钮事件监听器
  clear.addEventListener('click', function() {
    restoreOriginalImage();
  });

  // 修改批量处理函数
  async function processBatch(files) {
    // 创建ZIP文件
    const zip = new JSZip();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await processImage(file);
        zip.file(result.fileName, result.blob);
      } catch (error) {
        console.error(`处理文件 ${file.name} 时出错:`, error);
      }
    }
    
    // 生成并下载ZIP文件
    const zipBlob = await zip.generateAsync({type: 'blob'});
    saveAs(zipBlob, 'watermarked_images.zip');
  }
}else{
  alert('不支持canvas')
}

