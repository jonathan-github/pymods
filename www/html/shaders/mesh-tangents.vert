#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;

/*
 * Compute the texture space tangent and bitangent.
 * http://www.terathon.com/code/tangent.html
 * http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-13-normal-mapp
 */

#include "shaders/mesh-dqs.inc"

/// The location for the aTexIndex attribute.
#define INDEX_LOCATION 0

/**
 * The vertex coordinates:
 *	RGB32F(x,y,z) = uCoords[texUV(vertex_index)]
 */
uniform sampler2D uCoords;

/**
 * The vertex normals:
 *	RGB32F(nx,ny,nz) = uNormals[texUV(vertex_index)]
 */
uniform sampler2D uNormals;

/**
 * The neighboring triangle vertices:
 *	RG32UI(b0,c0) = uTexNeighbors[texUV(offset)]
 *	...
 *	RG32UI(bi,ci) = uTexNeighbors[texUV(offset + count - 1)]
 * @note ai is the current vertex
 */
uniform usampler2D uTexNeighbors;

/**
 * The neighboring triangle UV deltas:
 *	RGBA32F(du1,dv1,du2,dv2) = uTexDeltas[texUV(offset)]
 *	...
 *	RGBA32F(du1,dv1,du2,dv2) = uTexDeltas[texUV(offset + count - 1)]
 */
uniform sampler2D uTexDeltas;

/**
 * The offset and count for the neighboring triangles
 * vertices and UV deltas:
 *	uvec3(offset,count,vertex_index) = aTexIndex;
 */
layout(location = INDEX_LOCATION) in uvec3 aTexIndex;

/**
 * The texture coordinate's tangent.
 * @note the bitangent can be recomputed using:
 *	bitangent = tangent.w * cross(normal, tangent.xyz)
 */
out vec4 vTangent;

/**
 * The texture/model scaling factor to convert model space lengths
 * to texture space lengths.
 */
out float vTexScale;

void main() {
	uint offset = aTexIndex.x;
	uint count = aTexIndex.y;
	uint vi = aTexIndex.z;
	if (count == 0u) {
		vTangent = vec4(0.0, 0.0, 1.0, 1.0);	   
		return;
	}

	// compute the tangent and bitangent for each triangle
	vec3 p0 = texelFetch(uCoords, texUV(vi), 0).xyz;
	vec3 tangent = vec3(0.0);
	vec3 bitangent = vec3(0.0);
	float texScale = 0.0;
	for (uint i = offset, n = offset + count; i < n; ++i) {
		// fetch the triangle's p1, p2
		uvec2 tri = texelFetch(uTexNeighbors, texUV(i), 0).xy;
		vec3 p1 = texelFetch(uCoords, texUV(uint(tri.x)), 0).xyz;
		vec3 p2 = texelFetch(uCoords, texUV(uint(tri.y)), 0).xyz;

		// UV deltas
		vec4 duv = texelFetch(uTexDeltas, texUV(i), 0);

		// compute the tangent and bitangent for the triangle
		vec3 d1 = p1 - p0;
		vec3 d2 = p2 - p0;
		float r = 1.0 / (duv[0] * duv[3] - duv[1] * duv[2]);
		tangent += (d1 * duv[3] - d2 * duv[1]) * r;
		bitangent += (d2 * duv[0] - d1 * duv[2]) * r;
		
		texScale += length(vec2(duv[0], duv[1])) / length(d1);
		texScale += length(vec2(duv[2], duv[3])) / length(d2);
	}

	vTexScale = texScale / 2.0 * float(count);

	// fetch the vertex normal
	vec3 normal = texelFetch(uNormals, texUV(vi), 0).xyz;

	// Gram-Schmidt orthogonalize
	tangent = normalize(tangent - normal * dot(normal, tangent));

	// calculate handedness
	float w = (dot(cross(normal, tangent), bitangent) < 0.0 ? -1.0 : 1.0);
	vTangent = vec4(tangent, w);
}
