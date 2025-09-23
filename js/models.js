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
    endpoint: 'https://chutes-qwen-image.chutes.ai/generate',
    // Metadata for payload construction
    payloadFormat: 'flat',
    parameterMapping: {
      cfgScale: 'true_cfg_scale',
      steps: 'num_inference_steps'
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
      single_frame: { default: false },
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
  }
};