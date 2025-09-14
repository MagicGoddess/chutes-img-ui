# Chutes Image Models Schemas
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

## Hidream (hidream-i1-full)
### Example
```sh
curl -X POST \
		https://kikakkz-hidream-i1-full.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "seed": null,
    "width": 512,
    "height": 512,
    "prompt": "example-string",
    "guidance_scale": 5,
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
                "maximum": 100000000,
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
            "default": 512,
            "maximum": 2560,
            "minimum": 256
          },
          "height": {
            "type": "integer",
            "title": "Height",
            "default": 512,
            "maximum": 2560,
            "minimum": 256
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "guidance_scale": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 10,
                "minimum": 0
              },
              {
                "type": "null"
              }
            ],
            "title": "Guidance Scale",
            "default": 5
          },
          "num_inference_steps": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 75,
                "minimum": 5
              },
              {
                "type": "null"
              }
            ],
            "title": "Num Inference Steps",
            "default": 50
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
## Neta Lumina (neta-lumina)
### Example
```sh
curl -X POST \
		https://image.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "model": "neta-lumina",
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
        "$ref": "#/definitions/TextToImagePayload"
      }
    },
    "definitions": {
      "TextToImagePayload": {
        "type": "object",
        "required": [
          "prompt"
        ],
        "properties": {
          "cfg": {
            "gte": 4,
            "lte": 5.5,
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "CFG Scale",
            "default": 4.5,
            "description": "Classifier-free guidance scale"
          },
          "seed": {
            "gte": 0,
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 0,
            "description": "Seed for generation"
          },
          "steps": {
            "gte": 20,
            "lte": 50,
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Steps",
            "default": 30,
            "description": "Number of sampling steps"
          },
          "width": {
            "gte": 768,
            "lte": 2048,
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Width",
            "default": 1024,
            "description": "Image width"
          },
          "height": {
            "gte": 768,
            "lte": 2048,
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Height",
            "default": 1024,
            "description": "Image height"
          },
          "prompt": {
            "type": "string",
            "title": "Prompt",
            "description": "Text prompt for image generation"
          },
          "sampler": {
            "enum": [
              "res_multistep",
              "euler_ancestral"
            ],
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Sampler",
            "default": "res_multistep",
            "description": "Sampling method"
          },
          "scheduler": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Scheduler",
            "default": "linear_quadratic",
            "description": "Scheduler type"
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
            "default": "blurry, worst quality, low quality",
            "description": "Negative prompt to avoid unwanted features"
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
## JuggernautXL (JuggernautXL)
### Example
```sh
curl -X POST \
		https://image.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "model": "JuggernautXL",
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
          "guidance_scale": {
            "type": "number",
            "title": "Guidance Scale",
            "default": 7.5,
            "maximum": 20,
            "minimum": 1
          },
          "negative_prompt": {
            "type": "string",
            "title": "Negative Prompt",
            "default": ""
          },
          "num_inference_steps": {
            "type": "integer",
            "title": "Num Inference Steps",
            "default": 25,
            "maximum": 50,
            "minimum": 1
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
## FLUX.1 Dev (FLUX.1-dev)
### Example
```sh
curl -X POST \
		https://image.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "model": "FLUX.1-dev",
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
          "guidance_scale": {
            "type": "number",
            "title": "Guidance Scale",
            "default": 7.5,
            "maximum": 20,
            "minimum": 1
          },
          "num_inference_steps": {
            "type": "integer",
            "title": "Num Inference Steps",
            "default": 10,
            "maximum": 30,
            "minimum": 1
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

## iLustMix (iLustMix)
### Example
```sh
curl -X POST \
		https://image.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "model": "iLustMix",
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
          "guidance_scale": {
            "type": "number",
            "title": "Guidance Scale",
            "default": 7.5,
            "maximum": 20,
            "minimum": 1
          },
          "negative_prompt": {
            "type": "string",
            "title": "Negative Prompt",
            "default": ""
          },
          "num_inference_steps": {
            "type": "integer",
            "title": "Num Inference Steps",
            "default": 25,
            "maximum": 50,
            "minimum": 1
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

## Chroma (chroma)
### Example
```sh
curl -X POST \
		https://image.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "model": "chroma",
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
        "$ref": "#/definitions/TextToImagePayload"
      }
    },
    "definitions": {
      "TextToImagePayload": {
        "type": "object",
        "required": [
          "prompt"
        ],
        "properties": {
          "cfg": {
            "gte": 1,
            "lte": 7.5,
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "CFG Scale",
            "default": 4.5,
            "description": "CFG Scale for text generation."
          },
          "seed": {
            "gte": 0,
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 0,
            "description": "Seed for text generation."
          },
          "steps": {
            "gte": 5,
            "lte": 50,
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Steps",
            "default": 30,
            "description": "Steps for text generation."
          },
          "width": {
            "lte": 2048,
            "anyOf": [
              {
                "type": "integer",
                "minimum": 200
              },
              {
                "type": "null"
              }
            ],
            "title": "Width",
            "default": 1024,
            "description": "Width for text generation."
          },
          "height": {
            "lte": 2048,
            "anyOf": [
              {
                "type": "integer",
                "minimum": 200
              },
              {
                "type": "null"
              }
            ],
            "title": "Height",
            "default": 1024,
            "description": "Height for text generation."
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
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