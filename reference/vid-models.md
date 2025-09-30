# Chutes Video Models Schemas

## Wan2.1 14b text2video (wan2.1-14b)
### Example
```sh
curl -X POST \
		https://chutes-wan2-1-14b.chutes.ai/text2video \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "fps": 24,
    "seed": 42,
    "steps": 25,
    "prompt": "example-string",
    "resolution": "832*480",
    "sample_shift": null
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/text_to_video",
  "function": "text_to_video",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/text2video",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/VideoGenInput"
      }
    },
    "definitions": {
      "VideoGenInput": {
        "type": "object",
        "$defs": {
          "Resolution": {
            "enum": [
              "1280*720",
              "720*1280",
              "832*480",
              "480*832",
              "1024*1024"
            ],
            "type": "string",
            "title": "Resolution"
          }
        },
        "required": [
          "prompt"
        ],
        "properties": {
          "fps": {
            "type": "integer",
            "title": "Fps",
            "default": 24,
            "maximum": 60,
            "minimum": 16
          },
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "steps": {
            "type": "integer",
            "title": "Steps",
            "default": 25,
            "maximum": 30,
            "minimum": 10
          },
          "frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 241,
                "minimum": 81
              },
              {
                "type": "null"
              }
            ],
            "title": "Frames",
            "default": 81
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "resolution": {
            "anyOf": [
              {
                "$ref": "#/definitions/Resolution"
              },
              {
                "type": "null"
              }
            ],
            "default": "832*480"
          },
          "sample_shift": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Sample Shift",
            "default": null
          },
          "single_frame": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "title": "Single Frame",
            "default": false
          },
          "guidance_scale": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7.5,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Guidance Scale",
            "default": 5
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "Vibrant colors, overexposed, static, blurry details, subtitles, style, artwork, painting, picture, still, overall grayish, worst quality, low quality, JPEG compression artifacts, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn face, deformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background, three legs, many people in the background, walking backwards, slow motion"
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": "video/mp4",
  "minimal_input_schema": null
}
```

## Wan2.1 14b image2video (wan2.1-14b)
### Example
```sh
curl -X POST \
		https://chutes-wan2-1-14b.chutes.ai/image2video \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "seed": 42,
    "frames": 81,
    "prompt": "example-string",
    "image_b64": "example-string",
    "sample_shift": null,
    "guidance_scale": 5
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/image_to_video",
  "function": "image_to_video",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/image2video",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/I2VInput"
      }
    },
    "definitions": {
      "I2VInput": {
        "type": "object",
        "required": [
          "prompt",
          "image_b64"
        ],
        "properties": {
          "fps": {
            "type": "integer",
            "title": "Fps",
            "default": 24,
            "maximum": 60,
            "minimum": 16
          },
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "steps": {
            "type": "integer",
            "title": "Steps",
            "default": 25,
            "maximum": 30,
            "minimum": 10
          },
          "frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 241,
                "minimum": 81
              },
              {
                "type": "null"
              }
            ],
            "title": "Frames",
            "default": 81
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "image_b64": {
            "type": "string",
            "title": "Image B64"
          },
          "sample_shift": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Sample Shift",
            "default": null
          },
          "single_frame": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "title": "Single Frame",
            "default": false
          },
          "guidance_scale": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7.5,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Guidance Scale",
            "default": 5
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "Vibrant colors, overexposed, static, blurry details, subtitles, style, artwork, painting, picture, still, overall grayish, worst quality, low quality, JPEG compression artifacts, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn face, deformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background, three legs, many people in the background, walking backwards, slow motion"
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": "video/mp4",
  "minimal_input_schema": null
}
```

## Skyreels text2video (skyreels)
### Example
```sh
curl -X POST \
		https://chutes-skyreels.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "seed": 42,
    "prompt": "example-string",
    "resolution": "544x960",
    "guidance_scale": 6,
    "negative_prompt": "Aerial view, aerial view, overexposed, low quality, deformation, a poor composition, bad hands, bad teeth, bad eyes, bad limbs, distortion"
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/generate",
  "function": "generate",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/generate",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "input_args"
    ],
    "properties": {
      "input_args": {
        "$ref": "#/definitions/GenerationInput"
      }
    },
    "definitions": {
      "GenerationInput": {
        "type": "object",
        "$defs": {
          "Resolution": {
            "enum": [
              "544x960",
              "960x544"
            ],
            "type": "string",
            "title": "Resolution"
          }
        },
        "required": [
          "prompt"
        ],
        "properties": {
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "resolution": {
            "anyOf": [
              {
                "$ref": "#/definitions/Resolution"
              },
              {
                "type": "null"
              }
            ],
            "default": "544x960"
          },
          "guidance_scale": {
            "type": "number",
            "title": "Guidance Scale",
            "default": 6,
            "maximum": 10,
            "exclusiveMinimum": 1
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "Aerial view, aerial view, overexposed, low quality, deformation, a poor composition, bad hands, bad teeth, bad eyes, bad limbs, distortion"
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": null,
  "minimal_input_schema": null
}
```

## Skyreels image2video (skyreels)
### Example
```sh
curl -X POST \
		https://chutes-skyreels.chutes.ai/animate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "seed": 42,
    "prompt": "example-string",
    "image_b64": "example-string",
    "resolution": "544x960",
    "guidance_scale": 6,
    "negative_prompt": "Aerial view, aerial view, overexposed, low quality, deformation, a poor composition, bad hands, bad teeth, bad eyes, bad limbs, distortion"
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/animate",
  "function": "animate",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/animate",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "input_args"
    ],
    "properties": {
      "input_args": {
        "$ref": "#/definitions/AnimationInput"
      }
    },
    "definitions": {
      "AnimationInput": {
        "type": "object",
        "$defs": {
          "Resolution": {
            "enum": [
              "544x960",
              "960x544"
            ],
            "type": "string",
            "title": "Resolution"
          }
        },
        "required": [
          "prompt",
          "image_b64"
        ],
        "properties": {
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "image_b64": {
            "type": "string",
            "title": "Image B64"
          },
          "resolution": {
            "anyOf": [
              {
                "$ref": "#/definitions/Resolution"
              },
              {
                "type": "null"
              }
            ],
            "default": "544x960"
          },
          "guidance_scale": {
            "type": "number",
            "title": "Guidance Scale",
            "default": 6,
            "maximum": 10,
            "exclusiveMinimum": 1
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "Aerial view, aerial view, overexposed, low quality, deformation, a poor composition, bad hands, bad teeth, bad eyes, bad limbs, distortion"
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": null,
  "minimal_input_schema": null
}
```

## Skyreels V2 14b 540p image2video (skyreels-v2-14b-540p)
### Example
```sh
curl -X POST \
		https://kikakkz-skyreels-v2-14b-540p.chutes.ai/image2video \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "prompt": "example-string",
    "ar_step": 0,
    "img_b64_first": null,
    "base_num_frames": 97,
    "inference_steps": 30,
    "causal_block_size": 1,
    "addnoise_condition": 20
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/image_to_video",
  "function": "image_to_video",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/image2video",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/VideoGenInput"
      }
    },
    "definitions": {
      "VideoGenInput": {
        "type": "object",
        "$defs": {
          "Resolution": {
            "enum": [
              "720P",
              "540P"
            ],
            "type": "string",
            "title": "Resolution"
          }
        },
        "required": [
          "prompt"
        ],
        "properties": {
          "fps": {
            "type": "integer",
            "title": "Fps",
            "default": 24,
            "maximum": 60,
            "minimum": 16
          },
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "shift": {
            "type": "number",
            "title": "Shift",
            "default": 8,
            "maximum": 10,
            "minimum": 1
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "ar_step": {
            "type": "integer",
            "title": "Ar Step",
            "default": 0,
            "maximum": 5,
            "minimum": 0
          },
          "num_frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 10000,
                "minimum": 97
              },
              {
                "type": "null"
              }
            ],
            "title": "Num Frames",
            "default": 97
          },
          "resolution": {
            "anyOf": [
              {
                "$ref": "#/definitions/Resolution"
              },
              {
                "type": "null"
              }
            ],
            "default": "540P"
          },
          "img_b64_last": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Img B64 Last",
            "default": null
          },
          "img_b64_first": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Img B64 First",
            "default": null
          },
          "guidance_scale": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7.5,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Guidance Scale",
            "default": 6
          },
          "base_num_frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 10000,
                "minimum": 97
              },
              {
                "type": "null"
              }
            ],
            "title": "Base Num Frames",
            "default": 97
          },
          "inference_steps": {
            "type": "integer",
            "title": "Inference Steps",
            "default": 30,
            "maximum": 50,
            "minimum": 10
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走"
          },
          "overlap_history": {
            "type": "integer",
            "title": "Overlap History",
            "default": 17,
            "maximum": 10000
          },
          "causal_block_size": {
            "type": "integer",
            "title": "Causal Block Size",
            "default": 1,
            "maximum": 50,
            "minimum": 0
          },
          "addnoise_condition": {
            "type": "integer",
            "title": "Addnoise Condition",
            "default": 20,
            "maximum": 50,
            "minimum": 0
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": "video/mp4",
  "minimal_input_schema": null
}
```

## Skyreels V2 14b 540p text2video (skyreels-v2-14b-540p)
### Example
```sh
curl -X POST \
		https://kikakkz-skyreels-v2-14b-540p.chutes.ai/text2video \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "fps": 24,
    "seed": 42,
    "prompt": "example-string",
    "guidance_scale": 6,
    "base_num_frames": 97,
    "overlap_history": 17,
    "causal_block_size": 1,
    "addnoise_condition": 20
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/text_to_video",
  "function": "text_to_video",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/text2video",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/VideoGenInput"
      }
    },
    "definitions": {
      "VideoGenInput": {
        "type": "object",
        "$defs": {
          "Resolution": {
            "enum": [
              "720P",
              "540P"
            ],
            "type": "string",
            "title": "Resolution"
          }
        },
        "required": [
          "prompt"
        ],
        "properties": {
          "fps": {
            "type": "integer",
            "title": "Fps",
            "default": 24,
            "maximum": 60,
            "minimum": 16
          },
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "shift": {
            "type": "number",
            "title": "Shift",
            "default": 8,
            "maximum": 10,
            "minimum": 1
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "ar_step": {
            "type": "integer",
            "title": "Ar Step",
            "default": 0,
            "maximum": 5,
            "minimum": 0
          },
          "num_frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 10000,
                "minimum": 97
              },
              {
                "type": "null"
              }
            ],
            "title": "Num Frames",
            "default": 97
          },
          "resolution": {
            "anyOf": [
              {
                "$ref": "#/definitions/Resolution"
              },
              {
                "type": "null"
              }
            ],
            "default": "540P"
          },
          "img_b64_last": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Img B64 Last",
            "default": null
          },
          "img_b64_first": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Img B64 First",
            "default": null
          },
          "guidance_scale": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7.5,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Guidance Scale",
            "default": 6
          },
          "base_num_frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 10000,
                "minimum": 97
              },
              {
                "type": "null"
              }
            ],
            "title": "Base Num Frames",
            "default": 97
          },
          "inference_steps": {
            "type": "integer",
            "title": "Inference Steps",
            "default": 30,
            "maximum": 50,
            "minimum": 10
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走"
          },
          "overlap_history": {
            "type": "integer",
            "title": "Overlap History",
            "default": 17,
            "maximum": 10000
          },
          "causal_block_size": {
            "type": "integer",
            "title": "Causal Block Size",
            "default": 1,
            "maximum": 50,
            "minimum": 0
          },
          "addnoise_condition": {
            "type": "integer",
            "title": "Addnoise Condition",
            "default": 20,
            "maximum": 50,
            "minimum": 0
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": "video/mp4",
  "minimal_input_schema": null
}
```

## Skyreels V2 1.3b 540p text2video (skyreels-v2-1.3b-540p)
### Example
```sh
curl -X POST \
		https://kikakkz-skyreels-v2-1-3b-540p.chutes.ai/text2video \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "fps": 24,
    "shift": 8,
    "prompt": "example-string",
    "num_frames": 97,
    "resolution": "540P",
    "base_num_frames": 97,
    "inference_steps": 30,
    "causal_block_size": 1
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/text_to_video",
  "function": "text_to_video",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/text2video",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/VideoGenInput"
      }
    },
    "definitions": {
      "VideoGenInput": {
        "type": "object",
        "$defs": {
          "Resolution": {
            "enum": [
              "720P",
              "540P"
            ],
            "type": "string",
            "title": "Resolution"
          }
        },
        "required": [
          "prompt"
        ],
        "properties": {
          "fps": {
            "type": "integer",
            "title": "Fps",
            "default": 24,
            "maximum": 60,
            "minimum": 16
          },
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "shift": {
            "type": "number",
            "title": "Shift",
            "default": 8,
            "maximum": 10,
            "minimum": 1
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "ar_step": {
            "type": "integer",
            "title": "Ar Step",
            "default": 0,
            "maximum": 5,
            "minimum": 0
          },
          "num_frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 10000,
                "minimum": 97
              },
              {
                "type": "null"
              }
            ],
            "title": "Num Frames",
            "default": 97
          },
          "resolution": {
            "anyOf": [
              {
                "$ref": "#/definitions/Resolution"
              },
              {
                "type": "null"
              }
            ],
            "default": "540P"
          },
          "img_b64_last": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Img B64 Last",
            "default": null
          },
          "img_b64_first": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Img B64 First",
            "default": null
          },
          "guidance_scale": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7.5,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Guidance Scale",
            "default": 6
          },
          "base_num_frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 10000,
                "minimum": 97
              },
              {
                "type": "null"
              }
            ],
            "title": "Base Num Frames",
            "default": 97
          },
          "inference_steps": {
            "type": "integer",
            "title": "Inference Steps",
            "default": 30,
            "maximum": 50,
            "minimum": 10
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走"
          },
          "overlap_history": {
            "type": "integer",
            "title": "Overlap History",
            "default": 17,
            "maximum": 10000
          },
          "causal_block_size": {
            "type": "integer",
            "title": "Causal Block Size",
            "default": 1,
            "maximum": 50,
            "minimum": 0
          },
          "addnoise_condition": {
            "type": "integer",
            "title": "Addnoise Condition",
            "default": 20,
            "maximum": 50,
            "minimum": 0
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": "video/mp4",
  "minimal_input_schema": null
}
```

## Skyreels V2 1.3b 540p image2video (skyreels-v2-1.3b-540p)
### Example
```sh
curl -X POST \
		https://kikakkz-skyreels-v2-1-3b-540p.chutes.ai/image2video \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "fps": 24,
    "shift": 8,
    "prompt": "example-string",
    "ar_step": 0,
    "resolution": "540P",
    "negative_prompt": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走",
    "overlap_history": 17,
    "causal_block_size": 1,
    "addnoise_condition": 20
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/image_to_video",
  "function": "image_to_video",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/image2video",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/VideoGenInput"
      }
    },
    "definitions": {
      "VideoGenInput": {
        "type": "object",
        "$defs": {
          "Resolution": {
            "enum": [
              "720P",
              "540P"
            ],
            "type": "string",
            "title": "Resolution"
          }
        },
        "required": [
          "prompt"
        ],
        "properties": {
          "fps": {
            "type": "integer",
            "title": "Fps",
            "default": 24,
            "maximum": 60,
            "minimum": 16
          },
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "shift": {
            "type": "number",
            "title": "Shift",
            "default": 8,
            "maximum": 10,
            "minimum": 1
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "ar_step": {
            "type": "integer",
            "title": "Ar Step",
            "default": 0,
            "maximum": 5,
            "minimum": 0
          },
          "num_frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 10000,
                "minimum": 97
              },
              {
                "type": "null"
              }
            ],
            "title": "Num Frames",
            "default": 97
          },
          "resolution": {
            "anyOf": [
              {
                "$ref": "#/definitions/Resolution"
              },
              {
                "type": "null"
              }
            ],
            "default": "540P"
          },
          "img_b64_last": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Img B64 Last",
            "default": null
          },
          "img_b64_first": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Img B64 First",
            "default": null
          },
          "guidance_scale": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7.5,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Guidance Scale",
            "default": 6
          },
          "base_num_frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 10000,
                "minimum": 97
              },
              {
                "type": "null"
              }
            ],
            "title": "Base Num Frames",
            "default": 97
          },
          "inference_steps": {
            "type": "integer",
            "title": "Inference Steps",
            "default": 30,
            "maximum": 50,
            "minimum": 10
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走"
          },
          "overlap_history": {
            "type": "integer",
            "title": "Overlap History",
            "default": 17,
            "maximum": 10000
          },
          "causal_block_size": {
            "type": "integer",
            "title": "Causal Block Size",
            "default": 1,
            "maximum": 50,
            "minimum": 0
          },
          "addnoise_condition": {
            "type": "integer",
            "title": "Addnoise Condition",
            "default": 20,
            "maximum": 50,
            "minimum": 0
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": "video/mp4",
  "minimal_input_schema": null
}
```