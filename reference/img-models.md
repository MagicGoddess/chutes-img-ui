# Chutes Image Models Schemas
## Qwen Image Edit 2509 (qwen-image-edit-2509)

### Example
```sh
curl -X POST \
		https://chutes-qwen-image-edit-2509.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "seed": null,
    "width": 1024,
    "height": 1024,
    "prompt": "example-string",
    "image_b64s": [
      "example-string"
    ],
    "true_cfg_scale": 4,
    "negative_prompt": "",
    "num_inference_steps": 40
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
        "required": [
          "prompt",
          "image_b64s"
        ],
        "properties": {
          "seed": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 4294967295,
                "minimum": 0
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": null
          },
          "width": {
            "type": "integer",
            "title": "Width",
            "default": 1024,
            "maximum": 2048,
            "minimum": 128
          },
          "height": {
            "type": "integer",
            "title": "Height",
            "default": 1024,
            "maximum": 2048,
            "minimum": 128
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "image_b64s": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "title": "Image B64S",
            "maxItems": 3,
            "minItems": 1
          },
          "true_cfg_scale": {
            "type": "number",
            "title": "True Cfg Scale",
            "default": 4,
            "maximum": 10,
            "minimum": 0
          },
          "negative_prompt": {
            "type": "string",
            "title": "Negative Prompt",
            "default": ""
          },
          "num_inference_steps": {
            "type": "integer",
            "title": "Num Inference Steps",
            "default": 40,
            "maximum": 100,
            "minimum": 5
          }
        }
      }
    }
  },
  "output_schema": {},
  "output_content_type": "image/jpeg",
  "minimal_input_schema": null
}
```
## Qwen Image Edit (qwen-image-edit)
### Example
```sh
curl -X POST \
		https://chutes-qwen-image-edit.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "seed": null,
    "width": 1024,
    "height": 1024,
    "prompt": "example-string",
    "image_b64": "example-string",
    "true_cfg_scale": 4,
    "negative_prompt": "",
    "num_inference_steps": 50
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
        "required": [
          "prompt",
          "image_b64"
        ],
        "properties": {
          "seed": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 4294967295,
                "minimum": 0
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": null
          },
          "width": {
            "type": "integer",
            "title": "Width",
            "default": 1024,
            "maximum": 2048,
            "minimum": 128
          },
          "height": {
            "type": "integer",
            "title": "Height",
            "default": 1024,
            "maximum": 2048,
            "minimum": 128
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "image_b64": {
            "type": "string",
            "title": "Image B64"
          },
          "true_cfg_scale": {
            "type": "number",
            "title": "True Cfg Scale",
            "default": 4,
            "maximum": 10,
            "minimum": 0
          },
          "negative_prompt": {
            "type": "string",
            "title": "Negative Prompt",
            "default": ""
          },
          "num_inference_steps": {
            "type": "integer",
            "title": "Num Inference Steps",
            "default": 50,
            "maximum": 100,
            "minimum": 5
          }
        }
      }
    }
  },
  "output_schema": {},
  "output_content_type": "image/jpeg",
  "minimal_input_schema": null
}
```
## Qwen Image (qwen-image)
### Example
```sh
curl -X POST \
		https://image.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "model": "qwen-image",
    "prompt": "A beautiful sunset over mountains",
    "negative_prompt": "blur, distortion, low quality",
    "guidance_scale": 7.5,
    "width": 1024,
    "height": 1024,
    "num_inference_steps": 50
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
        "required": [
          "prompt"
        ],
        "properties": {
          "seed": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 4294967295,
                "minimum": 0
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": null
          },
          "width": {
            "type": "integer",
            "title": "Width",
            "default": 1024,
            "maximum": 2048,
            "minimum": 128
          },
          "height": {
            "type": "integer",
            "title": "Height",
            "default": 1024,
            "maximum": 2048,
            "minimum": 128
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "true_cfg_scale": {
            "type": "number",
            "title": "True Cfg Scale",
            "default": 4,
            "maximum": 10,
            "minimum": 0
          },
          "negative_prompt": {
            "type": "string",
            "title": "Negative Prompt",
            "default": ""
          },
          "num_inference_steps": {
            "type": "integer",
            "title": "Num Inference Steps",
            "default": 50,
            "maximum": 100,
            "minimum": 5
          }
        }
      }
    }
  },
  "output_schema": {},
  "output_content_type": "image/jpeg",
  "minimal_input_schema": {
    "type": "object",
    "required": [
      "input_args"
    ],
    "properties": {
      "input_args": {
        "$ref": "#/definitions/MinifiedGenerationInput"
      }
    },
    "definitions": {
      "MinifiedGenerationInput": {
        "type": "object",
        "properties": {
          "prompt": {
            "type": "string",
            "title": "Prompt",
            "default": "a beautiful mountain landscape"
          }
        }
      }
    }
  }
}
```

## Wan2.1 14b Image (wan2.1-14b)
### Example
```sh
curl -X POST \
		https://chutes-wan2-1-14b.chutes.ai/text2image \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "seed": 42,
    "prompt": "example-string",
    "negative_prompt": "Vibrant colors, overexposed, static, blurry details, subtitles, style, artwork, painting, picture, still, overall grayish, worst quality, low quality, JPEG compression artifacts, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn face, deformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background, three legs, many people in the background, walking backwards, slow motion"
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/text_to_image",
  "function": "text_to_image",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/text2image",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/ImageGenInput"
      }
    },
    "definitions": {
      "ImageGenInput": {
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
  "output_content_type": "image/png",
  "minimal_input_schema": null
}
```