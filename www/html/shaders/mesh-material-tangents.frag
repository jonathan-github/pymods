#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;

#include "shaders/tone-mapping.inc"
#include "shaders/specular-ks.inc"

uniform vec3 uAmbientColor;
uniform vec3 uLightColor;
uniform vec3 uLightDirection;
uniform bool uToneMap;
uniform float uToneMapScale;

uniform bool uHasDiffuseTexture;
uniform sampler2D uDiffuseTexture;
uniform vec3 uDiffuseColor;

uniform bool uHasNormalTexture;
uniform sampler2D uNormalTexture;

uniform bool uHasBumpTexture;
uniform sampler2D uBumpTexture;
uniform float uBumpStrength;

uniform bool uHasSpecularTexture;
uniform sampler2D uSpecularTexture;

/// The view space position.
in vec4 vPosition;

/// The texture coordinate.
in vec2 vTexCoord;

/// The texture/model scale.
in float vTexScale;

/// The tangent space vectors.
in vec3 vNormal;
in vec3 vTangent;
in vec3 vBitangent;

/// The output fragment color.
out vec4 fColor;

vec3 faceNormal(vec3 v0, vec3 v1, vec3 v2, vec3 v3) {
	return (v0 - v1).yzx * (v0 + v1).zxy +
	       (v1 - v2).yzx * (v1 + v2).zxy +
	       (v2 - v3).yzx * (v2 + v3).zxy +
	       (v3 - v0).yzx * (v3 + v0).zxy;
}

vec3 bumpSample(vec2 dxy, float scale) {
	return vec3(dxy, texture(uBumpTexture, vTexCoord + dxy).r * scale);
}

/*
 * Compute the normal for the bump map by averaging the
 * surrounding normals:
 *	0 1 2
 *	3 x 5
 *	6 7 8
 */
vec3 bumpNormal(float dt, float scale) {
	// sample the bump map
	vec3 c0 = bumpSample(vec2(-dt, -dt), scale);
	vec3 c1 = bumpSample(vec2(0,   -dt), scale);
	vec3 c2 = bumpSample(vec2(dt,  -dt), scale);
	vec3 c3 = bumpSample(vec2(-dt, 0),   scale);
	vec3 c4 = bumpSample(vec2(0,   0),   scale);
	vec3 c5 = bumpSample(vec2(dt,  0),   scale);
	vec3 c6 = bumpSample(vec2(-dt, dt),  scale);
	vec3 c7 = bumpSample(vec2(0,   dt),  scale);
	vec3 c8 = bumpSample(vec2(dt,  dt),  scale);

	// average the normals
	vec3 n = faceNormal(c4, c3, c0, c1) +
		 faceNormal(c4, c1, c2, c5) +
		 faceNormal(c4, c5, c8, c7) +
		 faceNormal(c4, c7, c6, c3);
	return normalize(n);
}

void main() {
	vec3 normal = normalize(vNormal);

	if (uHasNormalTexture) {
		vec3 tangent = normalize(vTangent);
		vec3 bitangent = normalize(vBitangent);
		//tangent = normalize(tangent - normal * dot(normal, tangent));
		//vec3 bitangent = cross(normal, tangent);
		mat3 tm = mat3(tangent, bitangent, normal);
		vec3 tn = texture(uNormalTexture, vTexCoord).rgb * 2.0 - 1.0;
		if (uHasBumpTexture) {
			float dt = 1.0 / float(textureSize(uBumpTexture, 0).s);
			float scale = uBumpStrength * vTexScale;
			vec3 bn = bumpNormal(dt, scale);
			tn = normalize(mix(tn, bn, 0.25));
		}
		normal = normalize(tm * tn);
	}

	vec3 v = normalize(-vPosition.xyz);

	float weight = dot(normal, uLightDirection);

	vec3 ambient = uAmbientColor;
	vec3 diffuse = uDiffuseColor;
	if (uHasDiffuseTexture) {
		diffuse = toLinear(texture(uDiffuseTexture, vTexCoord).rgb);
	}
	ambient *= diffuse;
	diffuse *= uLightColor * max(weight, 0.0);

	vec3 specular;
	if (weight >= 0.0 && uHasSpecularTexture) {
#define SPECULAR_SCALE	-0.35
#define SPECULAR_BIAS	0.35
		float m = texture(uSpecularTexture, vTexCoord).r;
		m = m * SPECULAR_SCALE + SPECULAR_BIAS;
		float spec = KS_Skin_Specular(normal, uLightDirection, v, m, 1.0);
		specular = vec3(1.0) * spec;
	}

	vec3 color = ambient + diffuse + specular;
	if (uToneMap) {
		color = ACESFilm(color, uToneMapScale);
	}
	fColor = vec4(toGamma(color), 1.0);
}
