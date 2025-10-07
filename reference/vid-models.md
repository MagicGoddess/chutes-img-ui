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