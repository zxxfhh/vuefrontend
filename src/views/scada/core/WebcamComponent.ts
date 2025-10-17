/**
 * 摄像头组件管理器
 * 用于管理实时视频流，支持多种协议和功能
 *
 * 支持的协议：
 * - RTSP (Real Time Streaming Protocol) - 常用于IP摄像头
 * - RTMP (Real Time Messaging Protocol) - 常用于直播流
 * - HLS (HTTP Live Streaming) - 支持自适应码率
 * - WebRTC - 超低延迟实时通信
 * - HTTP/HTTPS - 普通HTTP视频流
 */

import { ref, Ref } from 'vue'

/**
 * 视频流协议类型
 */
export type StreamProtocol = 'rtsp' | 'rtmp' | 'hls' | 'webrtc' | 'http' | 'https'

/**
 * 视频质量预设
 */
export type VideoQuality = 'low' | 'medium' | 'high' | 'ultra' | 'auto'

/**
 * 摄像头状态
 */
export type WebcamStatus = 'disconnected' | 'connecting' | 'connected' | 'playing' | 'paused' | 'error'

/**
 * 摄像头配置接口
 */
export interface WebcamConfig {
  // 基本配置
  id: string                      // 摄像头唯一标识
  name: string                    // 摄像头名称
  streamUrl: string               // 视频流地址
  protocol: StreamProtocol        // 协议类型

  // 视频设置
  width?: number                  // 视频宽度（默认640）
  height?: number                 // 视频高度（默认480）
  quality?: VideoQuality          // 视频质量（默认auto）
  fps?: number                    // 帧率（默认25）

  // 认证配置
  username?: string               // 认证用户名
  password?: string               // 认证密码
  token?: string                  // API令牌

  // 高级配置
  autoPlay?: boolean              // 自动播放（默认true）
  autoReconnect?: boolean         // 自动重连（默认true）
  reconnectInterval?: number      // 重连间隔（毫秒，默认3000）
  reconnectMaxAttempts?: number   // 最大重连次数（默认10）
  bufferSize?: number             // 缓冲区大小（秒，默认1）

  // 功能开关
  enableSnapshot?: boolean        // 启用快照功能（默认true）
  enableFullscreen?: boolean      // 启用全屏功能（默认true）
  enableControls?: boolean        // 显示控制条（默认true）
  enablePTZ?: boolean             // 启用云台控制（默认false）

  // 显示设置
  objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'  // 视频适应方式（默认contain）
  showTimestamp?: boolean         // 显示时间戳（默认false）
  showBitrate?: boolean           // 显示码率信息（默认false）

  // 回调函数
  onConnected?: () => void        // 连接成功回调
  onDisconnected?: () => void     // 断开连接回调
  onError?: (error: Error) => void // 错误回调
  onSnapshot?: (dataUrl: string) => void // 快照回调
}

/**
 * 摄像头实例接口
 */
export interface WebcamInstance {
  id: string
  config: WebcamConfig
  status: Ref<WebcamStatus>
  videoElement: HTMLVideoElement | null

  // 控制方法
  connect: () => Promise<void>
  disconnect: () => void
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  reload: () => Promise<void>

  // 快照功能
  takeSnapshot: () => Promise<string>

  // 全屏功能
  enterFullscreen: () => void
  exitFullscreen: () => void
  toggleFullscreen: () => void

  // PTZ控制（云台控制）
  ptzControl?: {
    moveUp: () => void
    moveDown: () => void
    moveLeft: () => void
    moveRight: () => void
    zoomIn: () => void
    zoomOut: () => void
    stop: () => void
  }

  // 状态获取
  getBitrate: () => number
  getFramerate: () => number
  getResolution: () => { width: number; height: number }
}

/**
 * 摄像头组件管理器类
 */
export class WebcamManager {
  private static instance: WebcamManager
  private webcams: Map<string, WebcamInstance> = new Map()

  /**
   * 获取单例实例
   */
  static getInstance(): WebcamManager {
    if (!WebcamManager.instance) {
      WebcamManager.instance = new WebcamManager()
    }
    return WebcamManager.instance
  }

  /**
   * 创建摄像头实例
   */
  createWebcam(config: WebcamConfig): WebcamInstance {
    const existingWebcam = this.webcams.get(config.id)
    if (existingWebcam) {
      console.warn(`摄像头 ${config.id} 已存在，将返回现有实例`)
      return existingWebcam
    }

    const webcam = this.buildWebcamInstance(config)
    this.webcams.set(config.id, webcam)

    // 如果配置了自动播放，则自动连接
    if (config.autoPlay !== false) {
      webcam.connect().catch(err => {
        console.error(`摄像头 ${config.id} 自动连接失败:`, err)
      })
    }

    return webcam
  }

  /**
   * 构建摄像头实例
   */
  private buildWebcamInstance(config: WebcamConfig): WebcamInstance {
    const status = ref<WebcamStatus>('disconnected')
    let videoElement: HTMLVideoElement | null = null
    let reconnectAttempts = 0
    let reconnectTimer: number | null = null

    /**
     * 连接视频流
     */
    const connect = async (): Promise<void> => {
      try {
        status.value = 'connecting'

        // 创建video元素
        if (!videoElement) {
          videoElement = document.createElement('video')
          videoElement.style.width = config.width ? `${config.width}px` : '100%'
          videoElement.style.height = config.height ? `${config.height}px` : '100%'
          videoElement.style.objectFit = config.objectFit || 'contain'
          videoElement.autoplay = config.autoPlay !== false
          videoElement.muted = true // 默认静音以支持自动播放
          videoElement.controls = config.enableControls !== false
          videoElement.playsInline = true // iOS支持
        }

        // 根据协议类型连接
        await connectByProtocol(config.protocol, config.streamUrl, videoElement)

        status.value = 'connected'
        reconnectAttempts = 0

        // 播放视频
        if (config.autoPlay !== false) {
          await play()
        }

        // 触发连接回调
        config.onConnected?.()

      } catch (error) {
        status.value = 'error'
        console.error(`摄像头连接失败:`, error)
        config.onError?.(error as Error)

        // 自动重连
        if (config.autoReconnect !== false) {
          attemptReconnect()
        }
      }
    }

    /**
     * 根据协议连接视频流
     */
    const connectByProtocol = async (
      protocol: StreamProtocol,
      url: string,
      video: HTMLVideoElement
    ): Promise<void> => {
      switch (protocol) {
        case 'hls':
          await connectHLS(url, video)
          break
        case 'webrtc':
          await connectWebRTC(url, video)
          break
        case 'rtmp':
          await connectRTMP(url, video)
          break
        case 'rtsp':
          await connectRTSP(url, video)
          break
        case 'http':
        case 'https':
          await connectHTTP(url, video)
          break
        default:
          throw new Error(`不支持的协议: ${protocol}`)
      }
    }

    /**
     * 连接HLS流
     */
    const connectHLS = async (url: string, video: HTMLVideoElement): Promise<void> => {
      // 使用hls.js库
      if ((window as any).Hls) {
        const Hls = (window as any).Hls

        if (Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: config.bufferSize || 1,
            maxMaxBufferLength: 3,
            liveSyncDuration: 1,
          })

          hls.loadSource(url)
          hls.attachMedia(video)

          return new Promise((resolve, reject) => {
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              resolve()
            })
            hls.on(Hls.Events.ERROR, (_: any, data: any) => {
              if (data.fatal) {
                reject(new Error(`HLS错误: ${data.type} - ${data.details}`))
              }
            })
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari原生支持HLS
          video.src = url
          return Promise.resolve()
        } else {
          throw new Error('浏览器不支持HLS播放')
        }
      } else {
        // 降级到原生video标签
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url
          return Promise.resolve()
        } else {
          throw new Error('未加载hls.js库，且浏览器不支持原生HLS')
        }
      }
    }

    /**
     * 连接WebRTC流
     */
    const connectWebRTC = async (url: string, video: HTMLVideoElement): Promise<void> => {
      // 简化的WebRTC连接实现
      // 实际项目中需要使用完整的WebRTC信令服务器
      throw new Error('WebRTC支持需要配置信令服务器')
    }

    /**
     * 连接RTMP流（需要Flash或转码）
     */
    const connectRTMP = async (url: string, video: HTMLVideoElement): Promise<void> => {
      // RTMP在浏览器中需要通过服务器转码为HLS或WebRTC
      throw new Error('RTMP需要服务器端转码支持')
    }

    /**
     * 连接RTSP流（需要服务器转码）
     */
    const connectRTSP = async (url: string, video: HTMLVideoElement): Promise<void> => {
      // RTSP在浏览器中需要通过服务器转码为HLS或WebRTC
      throw new Error('RTSP需要服务器端转码支持')
    }

    /**
     * 连接HTTP/HTTPS流
     */
    const connectHTTP = async (url: string, video: HTMLVideoElement): Promise<void> => {
      video.src = url
      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('HTTP视频流加载失败'))
      })
    }

    /**
     * 尝试重连
     */
    const attemptReconnect = (): void => {
      const maxAttempts = config.reconnectMaxAttempts || 10
      const interval = config.reconnectInterval || 3000

      if (reconnectAttempts >= maxAttempts) {
        console.error(`摄像头 ${config.id} 达到最大重连次数，停止重连`)
        return
      }

      reconnectAttempts++
      console.log(`摄像头 ${config.id} 尝试重连 (${reconnectAttempts}/${maxAttempts})`)

      reconnectTimer = window.setTimeout(() => {
        connect()
      }, interval)
    }

    /**
     * 断开连接
     */
    const disconnect = (): void => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }

      if (videoElement) {
        videoElement.pause()
        videoElement.src = ''
        videoElement.load()
      }

      status.value = 'disconnected'
      config.onDisconnected?.()
    }

    /**
     * 播放视频
     */
    const play = async (): Promise<void> => {
      if (!videoElement) {
        throw new Error('视频元素未初始化')
      }

      try {
        await videoElement.play()
        status.value = 'playing'
      } catch (error) {
        console.error('播放失败:', error)
        throw error
      }
    }

    /**
     * 暂停视频
     */
    const pause = (): void => {
      if (videoElement) {
        videoElement.pause()
        status.value = 'paused'
      }
    }

    /**
     * 停止视频
     */
    const stop = (): void => {
      disconnect()
    }

    /**
     * 重新加载
     */
    const reload = async (): Promise<void> => {
      disconnect()
      await connect()
    }

    /**
     * 截取快照
     */
    const takeSnapshot = async (): Promise<string> => {
      if (!videoElement) {
        throw new Error('视频元素未初始化')
      }

      if (!config.enableSnapshot) {
        throw new Error('快照功能未启用')
      }

      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('无法创建canvas上下文')
      }

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      // 添加时间戳（如果启用）
      if (config.showTimestamp) {
        ctx.fillStyle = 'white'
        ctx.font = '16px Arial'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        const timestamp = new Date().toLocaleString('zh-CN')
        ctx.strokeText(timestamp, 10, canvas.height - 10)
        ctx.fillText(timestamp, 10, canvas.height - 10)
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      config.onSnapshot?.(dataUrl)

      return dataUrl
    }

    /**
     * 进入全屏
     */
    const enterFullscreen = (): void => {
      if (!config.enableFullscreen) {
        console.warn('全屏功能未启用')
        return
      }

      if (videoElement) {
        if (videoElement.requestFullscreen) {
          videoElement.requestFullscreen()
        } else if ((videoElement as any).webkitRequestFullscreen) {
          (videoElement as any).webkitRequestFullscreen()
        } else if ((videoElement as any).mozRequestFullScreen) {
          (videoElement as any).mozRequestFullScreen()
        } else if ((videoElement as any).msRequestFullscreen) {
          (videoElement as any).msRequestFullscreen()
        }
      }
    }

    /**
     * 退出全屏
     */
    const exitFullscreen = (): void => {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
    }

    /**
     * 切换全屏
     */
    const toggleFullscreen = (): void => {
      if (document.fullscreenElement) {
        exitFullscreen()
      } else {
        enterFullscreen()
      }
    }

    /**
     * 获取码率
     */
    const getBitrate = (): number => {
      // 实际实现需要通过stats API获取
      return 0
    }

    /**
     * 获取帧率
     */
    const getFramerate = (): number => {
      return config.fps || 25
    }

    /**
     * 获取分辨率
     */
    const getResolution = (): { width: number; height: number } => {
      if (videoElement) {
        return {
          width: videoElement.videoWidth,
          height: videoElement.videoHeight
        }
      }
      return { width: 0, height: 0 }
    }

    // 返回摄像头实例
    return {
      id: config.id,
      config,
      status,
      videoElement,
      connect,
      disconnect,
      play,
      pause,
      stop,
      reload,
      takeSnapshot,
      enterFullscreen,
      exitFullscreen,
      toggleFullscreen,
      getBitrate,
      getFramerate,
      getResolution
    }
  }

  /**
   * 获取摄像头实例
   */
  getWebcam(id: string): WebcamInstance | undefined {
    return this.webcams.get(id)
  }

  /**
   * 移除摄像头
   */
  removeWebcam(id: string): void {
    const webcam = this.webcams.get(id)
    if (webcam) {
      webcam.disconnect()
      this.webcams.delete(id)
    }
  }

  /**
   * 获取所有摄像头
   */
  getAllWebcams(): WebcamInstance[] {
    return Array.from(this.webcams.values())
  }

  /**
   * 清空所有摄像头
   */
  clearAll(): void {
    this.webcams.forEach(webcam => webcam.disconnect())
    this.webcams.clear()
  }
}

// 导出单例
export const webcamManager = WebcamManager.getInstance()
