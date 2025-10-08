// Model configurations based on actual API schemas from img-models.jsonl and vid-models.md
export const MODEL_CONFIGS = {

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
  'hidream': {
    name: 'HiDream',
    endpoint: 'https://chutes-hidream.chutes.ai/generate',
    // Metadata for payload construction
    payloadFormat: 'flat',
    resolutionFormat: 'x', // uses WxH format
    parameterMapping: {
      cfgScale: 'guidance_scale',
      steps: 'num_inference_steps'
    },
    // Model-specific message/warning
    message: {
      type: 'warning',
      text: '⚠️ Note: Width and height dimensions for most resolutions are currently swapped due to a bug on Chutes server side.'
    },
    params: {
      // This model uses named resolution presets rather than free width/height inputs
      resolution: {
        // allowed enum values from schema: "1024x1024", "768x1360", "1360x768", "880x1168", "1168x880", "1248x832", "832x1248"
        options: ['1024x1024', '768x1360', '1360x768', '880x1168', '1168x880', '1248x832', '832x1248'],
        default: '1024x1024'
      },
      guidance_scale: { min: 0, max: 10, default: 5, step: 0.1 },
      num_inference_steps: { min: 5, max: 75, default: 50, step: 1 },
      seed: { min: 0, max: 100000000, default: null }
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

  'musetalk': {
    name: 'Musetalk',
    // Metadata to inform payload construction and UI behavior
    payloadFormat: 'flat', // flat JSON at top level
    includeResolutionIn: [], // Musetalk does not use resolution
    endpoints: {
      lipsync: 'https://chutes-musetalk.chutes.ai/generate'
    },
    params: {
      fps: { min: 1, max: 60, default: 25, step: 1 },
      batch_size: { min: 1, max: 32, default: 8, step: 1 },
      extra_margin: { min: 0, max: 50, default: 10, step: 1 },
      parsing_mode: { 
        type: 'enum',
        options: ['jaw'],
        default: 'jaw'
      },
      left_cheek_width: { min: 0, max: 200, default: 90, step: 1 },
      right_cheek_width: { min: 0, max: 200, default: 90, step: 1 }
    },
    // Musetalk requires both audio and video inputs
    audioInput: {
      type: 'single',
      field: 'audio_input',
      required: true
    },
    videoInput: {
      type: 'single', 
      field: 'video_input',
      required: true
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