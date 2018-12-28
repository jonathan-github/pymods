#version 300 es

/*
 * Test shader for reading vertex coordinates and normals from a texture.
 */

precision highp float;
precision highp int;
precision highp sampler2D;

#include "shaders/mesh-dqs.inc"

uniform mat4 pMatrix;
uniform mat4 vMatrix;
uniform mat4 mMatrix;

/**
 * array of vertex coordinates
 *	RGB32F(x,y,z) = uCoords[texUV(vi)]
 */
uniform sampler2D uCoords;

/**
 * array of vertex normals
 *	RGB32F(Nx,Ny,Nz) = uNormals[texUV(vi)]
 */
uniform sampler2D uNormals;

/**
 * Color mode
 */
uniform int uColorMode;

out vec3 vColor;

void main() {
	ivec2 uv = texUV(uint(gl_VertexID));
	vec3 coord = texelFetch(uCoords, uv, 0).xyz;
	vec3 normal = texelFetch(uNormals, uv, 0).xyz;

	gl_Position = pMatrix * vMatrix * mMatrix * vec4(coord, 1.0);

	// convert normal to color
	if (uColorMode == 0) {
		vColor = (normal + 1.0) / 2.0;
	} else if (uColorMode == 1) {
		vColor = vec3((normal.g + 1.0) / 2.0);
	} else if (uColorMode == 2) {
		vColor = vec3((normal.g * normal.b + 1.0) / 2.0);
	}

	//vColor = vec3((normal.g + 1.0) / 2.0);
	//vColor = vec3((normal.g * normal.b + 1.0) / 2.0);
}
