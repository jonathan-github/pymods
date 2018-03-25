#version 300 es

/*
 * mesh material shader
 */

precision highp float;
precision highp int;
precision highp sampler2D;

#include "shaders/mesh-dqs.inc"

#define TEX_COORD_LOCATION	0

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

/// The view space position.
out vec4 vPosition;

/// The texture coordinate.
out vec2 vTexCoord;

/// The normal.
out vec3 vNormal;

void main() {
	vec3 coord = texelFetch(uCoords, texUV(uint(aTexCoord.p)), 0).xyz;
	vec3 normal = texelFetch(uNormals, texUV(uint(aTexCoord.p)), 0).xyz;

	vPosition = mvMatrix * vec4(coord, 1.0);
	gl_Position = pMatrix * vPosition;

	vTexCoord = aTexCoord.st;
	vNormal = (nMatrix * vec4(normal, 0.0)).xyz;
}
