// Model configurations based on actual API schemas from img-models.jsonl and vid-models.md
export const MODEL_CONFIGS = {
  'hidream': {
    name: 'Hidream',
    endpoint: 'https://kikakkz-hidream-i1-full.chutes.ai/generate',
    // Metadata for payload construction
    payloadFormat: 'flat', // flat JSON at top level
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 256, max: 2560, default: 1024, step: 64 },
      height: { min: 256, max: 2560, default: 1024, step: 64 },
      guidance_scale: { min: 0, max: 10, default: 5, step: 0.1 },
      num_inference_steps: { min: 5, max: 75, default: 50, step: 1 },
      seed: { min: 0, max: 100000000, default: null }
    }
  },
  'qwen-image': {
    name: 'Qwen Image',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'qwen-image',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 50, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'flux-dev': {
    name: 'FLUX.1 Dev',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'FLUX.1-dev',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 30, default: 30, step: 1 },
      seed: { min: 0, max: 4294967295, default: null }
    }
  },
  'juggernaut-xl': {
    name: 'JuggernautXL',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'JuggernautXL',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 25, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'chroma': {
    name: 'Chroma',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'chroma',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 200, max: 2048, default: 1024, step: 64 },
      height: { min: 200, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 7.5, default: 4.5, step: 0.1 },
      num_inference_steps: { min: 5, max: 50, default: 30, step: 1 },
      seed: { min: 0, max: null, default: 0 }
    }
  },
  'ilust-mix': {
    name: 'iLustMix',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'iLustMix',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 25, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'neta-lumina': {
    name: 'Neta Lumina',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'neta-lumina',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 768, max: 2048, default: 1024, step: 64 },
      height: { min: 768, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 20, max: 50, default: 30, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: 'blurry, worst quality, low quality' }
    }
  }
  ,
  'wan2.1-14b': {
    name: 'Wan2.1 14b',
    endpoint: 'https://chutes-wan2-1-14b.chutes.ai/text2image',
    // Metadata for payload construction
    payloadFormat: 'flat',
    resolutionFormat: 'star', // uses W*H format
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'steps' // this model uses 'steps' not 'num_inference_steps'
    },
    params: {
      // This model uses named resolution presets rather than free width/height inputs
      resolution: {
        // allowed enum values: "1280*720", "720*1280", "832*480", "480*832", "1024*1024"
        options: ['1280*720', '720*1280', '832*480', '480*832', '1024*1024'],
        default: '832*480'
      },
      sample_shift: { min: 1, max: 7, default: null, step: 0.1 },
      guidance_scale: { min: 1, max: 7.5, default: 5, step: 0.1 },
      seed: { min: 0, max: null, default: null },
      negative_prompt: { default: 'Vibrant colors, overexposed, static, blurry details, subtitles, style, artwork, painting, picture, still, overall grayish, worst quality, low quality, JPEG compression artifacts, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn face, deformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background, three legs, many people in the background, walking backwards, slow motion' }
    }
  }
  ,
  'nova-anime3d-xl': {
    name: 'Nova Anime3d Xl',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'nova-anime3d-xl',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 25, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'illustrij': {
    name: 'Illustrij',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'Illustrij',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 25, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'orphic-lora': {
    name: 'Orphic Lora',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'orphic-lora',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      pixel_scale: { min: 0, max: 1, default: 0.7, step: 0.01 },
      turbo_scale: { min: 0, max: 1, default: 0.7, step: 0.01 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 30, default: 10, step: 1 },
      seed: { min: 0, max: 4294967295, default: null }
    }
  },
  'animij': {
    name: 'Animij',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'Animij',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 25, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'hassaku-xl': {
    name: 'HassakuXL',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'HassakuXL',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 25, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'nova-cartoon-xl': {
    name: 'Nova Cartoon Xl',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'nova-cartoon-xl',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 25, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  }
};

// Video model configurations for video generation
export const VIDEO_MODEL_CONFIGS = {
  'wan2.1-14b-video': {
    name: 'Wan2.1 14b Video',
    // Metadata to inform payload construction and UI behavior
    payloadFormat: 'flat', // flat JSON at top level
    resolutionFormat: 'star', // resolution expressed as "W*H"
    includeResolutionIn: ['text2video'], // Wan i2v omits resolution
    endpoints: {
      text2video: 'https://chutes-wan2-1-14b.chutes.ai/text2video',
      image2video: 'https://chutes-wan2-1-14b.chutes.ai/image2video'
    },
    params: {
      resolution: {
        options: ['1280*720', '720*1280', '832*480', '480*832', '1024*1024'],
        default: '832*480'
      },
      fps: { min: 16, max: 60, default: 24, step: 1 },
      steps: { min: 10, max: 30, default: 25, step: 1 },
      frames: { min: 81, max: 241, default: 81, step: 1 },
  sample_shift: { min: 1, max: 7, default: null, step: 0.1 },
      guidance_scale: { min: 1, max: 7.5, default: 5, step: 0.1 },
      seed: { min: 0, max: null, default: 42 },
      negative_prompt: { default: 'Vibrant colors, overexposed, static, blurry details, subtitles, style, artwork, painting, picture, still, overall grayish, worst quality, low quality, JPEG compression artifacts, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn face, deformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background, three legs, many people in the background, walking backwards, slow motion' }
    }
  },
  'skyreels-video': {
    name: 'Skyreels',
    // Metadata to inform payload construction and UI behavior
    payloadFormat: 'flat', // flat JSON at top level
    resolutionFormat: 'x', // resolution expressed as "WxH"
    includeResolutionIn: ['text2video', 'image2video'],
    endpoints: {
      text2video: 'https://chutes-skyreels.chutes.ai/generate',
      image2video: 'https://chutes-skyreels.chutes.ai/animate'
    },
    params: {
      resolution: {
        options: ['544x960', '960x544'],
        default: '544x960'
      },
      guidance_scale: { min: 1.001, max: 10, default: 6, step: 0.1 },
      seed: { min: 0, max: null, default: 42 },
      negative_prompt: { default: 'Aerial view, aerial view, overexposed, low quality, deformation, a poor composition, bad hands, bad teeth, bad eyes, bad limbs, distortion' }
    }
  },
  'skyreels-v2-14b-540p': {
    name: 'Skyreels V2 14b 540p',
    // Metadata to inform payload construction and UI behavior
    payloadFormat: 'flat',
    // Resolution is an enum like "720P" or "540P"; keep as-is
    resolutionFormat: 'enum',
    includeResolutionIn: ['text2video', 'image2video'],
    endpoints: {
      // Text2Video endpoint assumed by convention; if unavailable server-side, request will fail and surface error
      text2video: 'https://kikakkz-skyreels-v2-14b-540p.chutes.ai/text2video',
      image2video: 'https://kikakkz-skyreels-v2-14b-540p.chutes.ai/image2video'
    },
    // This model supports start and end frame images in image-to-video mode
    imageInput: {
      type: 'multiple',
      maxItems: 2,
      minItems: 1,
      mapping: {
        single: 'img_b64_first',
        multiple: ['img_b64_first', 'img_b64_last']
      },
      hint: 'Supports start (first) and end (last) frames. Upload 1–2 images and drag to reorder.'
    },
    params: {
      resolution: {
        options: ['720P', '540P'],
        default: '540P'
      },
      fps: { min: 16, max: 60, default: 24, step: 1 },
      seed: { min: 0, max: null, default: 42 },
      shift: { min: 1, max: 10, default: 8, step: 0.1 },
      ar_step: { min: 0, max: 5, default: 0, step: 1 },
      // Both num_frames and base_num_frames exist in schema; include both so backend can use either
      num_frames: { min: 97, max: 10000, default: 97, step: 1 },
      base_num_frames: { min: 97, max: 10000, default: 97, step: 1 },
      guidance_scale: { min: 1, max: 7.5, default: 6, step: 0.1 },
      inference_steps: { min: 10, max: 50, default: 30, step: 1 },
      overlap_history: { min: 0, max: 10000, default: 17, step: 1 },
      causal_block_size: { min: 0, max: 50, default: 1, step: 1 },
      addnoise_condition: { min: 0, max: 50, default: 20, step: 1 },
      // Image fields included for completeness; values provided via imageInput mapping in payload builder
      img_b64_first: { default: null },
      img_b64_last: { default: null },
      negative_prompt: { default: '色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走' }
    }
  }
  ,
  'skyreels-v2-1.3b-540p': {
    name: 'Skyreels V2 1.3b 540p',
    // Metadata to inform payload construction and UI behavior
    payloadFormat: 'flat',
    // Resolution is an enum like "720P" or "540P"; keep as-is
    resolutionFormat: 'enum',
    includeResolutionIn: ['text2video', 'image2video'],
    endpoints: {
      text2video: 'https://kikakkz-skyreels-v2-1-3b-540p.chutes.ai/text2video',
      image2video: 'https://kikakkz-skyreels-v2-1-3b-540p.chutes.ai/image2video'
    },
    // Supports start and end frame images in image-to-video mode
    imageInput: {
      type: 'multiple',
      maxItems: 2,
      minItems: 1,
      mapping: {
        single: 'img_b64_first',
        multiple: ['img_b64_first', 'img_b64_last']
      },
      hint: 'Supports start (first) and end (last) frames. Upload 1–2 images and drag to reorder.'
    },
    params: {
      resolution: {
        options: ['720P', '540P'],
        default: '540P'
      },
      fps: { min: 16, max: 60, default: 24, step: 1 },
      seed: { min: 0, max: null, default: 42 },
      shift: { min: 1, max: 10, default: 8, step: 0.1 },
      ar_step: { min: 0, max: 5, default: 0, step: 1 },
      num_frames: { min: 97, max: 10000, default: 97, step: 1 },
      base_num_frames: { min: 97, max: 10000, default: 97, step: 1 },
      guidance_scale: { min: 1, max: 7.5, default: 6, step: 0.1 },
      inference_steps: { min: 10, max: 50, default: 30, step: 1 },
      overlap_history: { min: 0, max: 10000, default: 17, step: 1 },
      causal_block_size: { min: 0, max: 50, default: 1, step: 1 },
      addnoise_condition: { min: 0, max: 50, default: 20, step: 1 },
      // Image fields included for completeness
      img_b64_first: { default: null },
      img_b64_last: { default: null },
      negative_prompt: { default: '色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走' }
    }
  }
};

// Image Edit model configurations (for Image Edit mode)
// These define how to build payloads and what the UI should allow for source images
export const EDIT_MODEL_CONFIGS = {
  // Place 2509 first so it appears first in the dropdown and becomes default
  'qwen-image-edit-2509': {
    name: 'Qwen Image Edit 2509',
    endpoint: 'https://chutes-qwen-image-edit-2509.chutes.ai/generate',
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'true_cfg_scale',
      steps: 'num_inference_steps'
    },
    imageInput: {
      type: 'multiple',
      field: 'image_b64s',
      maxItems: 3,
      minItems: 1
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      true_cfg_scale: { min: 0, max: 10, default: 4, step: 0.1 },
      num_inference_steps: { min: 5, max: 100, default: 40, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'qwen-image-edit': {
    name: 'Qwen Image Edit',
    endpoint: 'https://chutes-qwen-image-edit.chutes.ai/generate',
    payloadFormat: 'flat',
    // Maps UI concepts to model parameter names
    parameterMapping: {
      cfgScale: 'true_cfg_scale',
      steps: 'num_inference_steps'
    },
    imageInput: {
      type: 'single',
      field: 'image_b64',
      maxItems: 1
    },
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      true_cfg_scale: { min: 0, max: 10, default: 4, step: 0.1 },
      num_inference_steps: { min: 5, max: 100, default: 50, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  "hidream-edit": {
    name: "Hidream Edit",
    endpoint: "https://chutes-hidream-edit.chutes.ai/generate",
    payloadFormat: 'flat',
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: {
        default: 5,
        min: 0,
        max: 10
      },
      num_inference_steps: {
        default: 28,
        min: 5,
        max: 75
      },
      seed: {
        default: null,
        min: 0,
        max: 100000000
      },
      negative_prompt: {
        default: "low resolution, blur"
      },
      image_guidance_scale: {
        default: 4,
        min: 0,
        max: 10
      }
    },
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    imageInput: {
      type: 'single',
      field: 'image_b64',
      maxItems: 1
    }
  }
};

// Text-to-Speech model configurations
// These definitions drive the TTS UI and payload builder generically.
export const TTS_MODEL_CONFIGS = {
  'kokoro': {
    name: 'Kokoro',
    endpoint: 'https://chutes-kokoro.chutes.ai/speak',
    payloadFormat: 'flat',
    // Simple params: text (required), optional speed and voice enum
    params: {
      text: { required: true },
      speed: { min: 0.1, max: 3, step: 0.1, default: 1 },
      voice: {
        type: 'enum',
        options: [
          'af_heart','af_alloy','af_aoede','af_bella','af_jessica','af_kore','af_nicole','af_nova','af_river','af_sarah','af_sky',
          'am_adam','am_echo','am_eric','am_fenrir','am_liam','am_michael','am_onyx','am_puck','am_santa',
          'bf_alice','bf_emma','bf_isabella','bf_lily',
          'bm_daniel','bm_fable','bm_george','bm_lewis',
          'ef_dora','em_alex','em_santa','ff_siwis',
          'hf_alpha','hf_beta','hm_omega','hm_psi',
          'if_sara','im_nicola',
          'jf_alpha','jf_gongitsune','jf_nezumi','jf_tebukuro','jm_kumo',
          'pf_dora','pm_alex','pm_santa',
          'zf_xiaobei','zf_xiaoni','zf_xiaoxiao','zf_xiaoyi','zm_yunjian','zm_yunxi','zm_yunxia','zm_yunyang'
        ],
        default: 'af_heart'
      }
    }
  },
  'spark-tts': {
    name: 'Spark TTS',
    endpoint: 'https://chutes-spark-tts.chutes.ai/speak',
    payloadFormat: 'flat',
    // Supports reference audio and various sampling controls
    audioInput: { type: 'single', field: 'sample_audio_b64', label: 'Reference audio (optional)' },
    params: {
      text: { required: true },
      pitch: { type: 'enum', options: ['very_low','low','moderate','high','very_high'], default: 'moderate' },
      speed: { type: 'enum', options: ['very_low','low','moderate','high','very_high'], default: 'moderate' },
      top_k: { min: 1, max: 200, step: 1, default: 50 },
      top_p: { min: 0, max: 1, step: 0.01, default: 0.95 },
      gender: { type: 'enum', options: ['male','female'], default: 'female' },
      temperature: { min: 0, max: 2, step: 0.05, default: 0.8 },
      sample_audio_text: { default: null }
    }
  },
  'cosy-voice-tts-16g': {
    name: 'Cosy Voice TTS 16g',
    endpoint: 'https://kikakkz-cosy-voice-tts-16g.chutes.ai/v1/speak',
    payloadFormat: 'flat',
    // Requires a prompt reference audio and matching transcript text
    audioInput: { type: 'single', field: 'prompt_audio_b64', label: 'Prompt audio (required)' },
    params: {
      text: { required: true },
      speed: { min: 0.1, max: 3, step: 0.1, default: 1 },
      prompt_audio_text: { required: true }
    }
  },
  'csm-1b': {
    name: 'CSM 1B',
    endpoint: 'https://chutes-csm-1b.chutes.ai/speak',
    payloadFormat: 'flat',
    // Context is supported by the API but omitted from UI for now; speaker optional
    params: {
      text: { required: true },
      speaker: { min: 0, max: 1, step: 1, default: 1 },
      max_duration_ms: { min: 1000, max: 60000, step: 500, default: 10000 }
    }
  }
};