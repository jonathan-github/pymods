#version 300 es

/*
 * mesh material shader
 */

precision highp float;
precision highp int;
precision highp sampler2D;

#include "shaders/mesh-dqs.inc"

#define TEX_COORD_LOCATION	0
#define TEX_SCALE_LOCATION	1
#define TANGENT_LOCATION	2

uniform mat4 pMatrix;
uniform mat4 mvMatrix;
uniform mat4 nMatrix;

/**
 * The vertex coordinates:
 *	RGB32F(x,y,z) = uCoords[texUV(vi)]
 */
uniform sampler2D uCoords;

/**
 * The vertex normals:
 *	RGB32F(Nx,Ny,Nz) = uNormals[texUV(vi)]
 */
uniform sampler2D uNormals;

/**
 * The UV coordinates + vertex_index:
 *	vec3(U,V,vertex_index) = aTexCoord
 */
layout(location = TEX_COORD_LOCATION) in vec3 aTexCoord;

/**
 * The texture/model scale:
 *	float(texture/model) = aTexScale
 */
layout(location = TEX_SCALE_LOCATION) in float aTexScale;

/**
 * The texture coordinate tangent and handedness:
 *	vec4(Tx, Ty, Tz, H) = aTangent
 */
layout(location = TANGENT_LOCATION) in vec4 aTangent;

/// The view space position.
out vec4 vPosition;

/// The texture coordinate.
out vec2 vTexCoord;

/// The texture scale;
out float vTexScale;

/// The tangent space vectors.
out vec3 vNormal;
out vec3 vTangent;
out vec3 vBitangent;

void main() {
	vec3 coord = texelFetch(uCoords, texUV(uint(aTexCoord.p)), 0).xyz;
	vec3 normal = texelFetch(uNormals, texUV(uint(aTexCoord.p)), 0).xyz;

	vPosition = mvMatrix * vec4(coord, 1.0);
	gl_Position = pMatrix * vPosition;

	vTexCoord = aTexCoord.st;
	vTexScale = aTexScale;
	vNormal = (nMatrix * vec4(normal, 0.0)).xyz;
	vTangent = (nMatrix * vec4(aTangent.xyz, 0.0)).xyz;
	vBitangent = aTangent.w * cross(vNormal, vTangent);
}
