#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;

#include "shaders/tone-mapping.inc"
#include "shaders/pbr.inc"

uniform vec3 uAmbientColor;
uniform vec3 uLightColor;
uniform vec3 uLightDirection;
uniform bool uToneMap;
uniform float uToneMapScale;

uniform bool uHasDiffuseTexture;
uniform sampler2D uDiffuseTexture;
uniform vec3 uDiffuseColor;

uniform bool uHasCutoutTexture;
uniform sampler2D uCutoutTexture;
uniform float uCutoutThreshold;
uniform bool uCutoutBlend;

uniform float uRoughness;
uniform float uMetallic;

/// The view space position.
in vec4 vPosition;

/// The texture coordinate.
in vec2 vTexCoord;

/// The normal.
in vec3 vNormal;

/// The output fragment color.
out vec4 fColor;

void main() {
	vec3 normal = normalize(vNormal);
	vec3 v = normalize(-vPosition.xyz);

	vec3 ambient = uAmbientColor;
	vec3 diffuse = uDiffuseColor;
	if (uHasDiffuseTexture) {
		diffuse = toLinear(texture(uDiffuseTexture, vTexCoord).rgb);
	}
	ambient *= diffuse;

	vec3 F0 = vec3(0.04);
	F0 = mix(F0, diffuse, uMetallic);
	diffuse = radiance(normal, v, uLightDirection, uLightColor,
			   diffuse, uRoughness, F0, uMetallic);

	vec4 color = vec4(ambient + diffuse, 1.0);
	if (uToneMap) {
		color.rgb = ACESFilm(color.rgb, uToneMapScale);
	}

	if (uHasCutoutTexture) {
		float alpha = texture(uCutoutTexture, vTexCoord).r;
		if (uCutoutBlend) {
			/* alpha blend pass */
			color = vec4(color.rgb * alpha, alpha);
		} else {
			/* depth path */
			if (alpha < uCutoutThreshold) {
				discard;
			}
		}
	}

	fColor = toGamma(color);
}
