#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;

/*
 * Compute the vertex normals for a mesh by averaging
 * the normals of its neighboring faces.
 */

#include "shaders/mesh-dqs.inc"

/// attribute locations
#define INDEX_LOCATION	0

/**
 * texture for accessing the vertex's transformed vertex coordinates
 *	RGB32F(x,y,z) = uCoords[texUV(vertex_index)]
 */
uniform sampler2D uCoords;

/**
 * texture for accessing the vertex's neighbor polygons
 *	RGBA32UI(p0,p1,p2,p3) = uNeighbors[texUV(offset)]
 *	..
 *	RGBA32UI(p0,p1,p2,p3) = uNeighbors[texUV(offset + count - 1)]
 */
uniform usampler2D uNeighbors;

/**
 * The neighbors for each vertex.
 */
layout(location = INDEX_LOCATION) in uvec2 aNeighborIndex;

/**
 * The normal for the vertex.
 */
out vec3 vNormal;

void main() {
	uint offset = uint(aNeighborIndex.x);
	uint count = uint(aNeighborIndex.y);
#ifdef DEBUG
	if (count == 0u) {
		/* shouldn't happen */
		vNormal = vec3(0.0, 0.0, 1.0);
		return;
	}
#endif /* DEBUG */

	vec3 normal = vec3(0.0);
	for (uint i = offset, n = offset + count; i <n; ++i) {
		// compute the normal for each neighboring poly
		uvec4 q = texelFetch(uNeighbors, texUV(i), 0);
		vec3 a = texelFetch(uCoords, texUV(q.x), 0).xyz;
		vec3 b = texelFetch(uCoords, texUV(q.y), 0).xyz;
		vec3 c = texelFetch(uCoords, texUV(q.z), 0).xyz;
		vec3 d = texelFetch(uCoords, texUV(q.w), 0).xyz;

		// ab
		float x = (a.y - b.y) * (a.z + b.z);
		float y = (a.z - b.z) * (a.x + b.x);
		float z = (a.x - b.x) * (a.y + b.y);
		// bc
		x += (b.y - c.y) * (b.z + c.z);
		y += (b.z - c.z) * (b.x + c.x);
		z += (b.x - c.x) * (b.y + c.y);
		// cd
		x += (c.y - d.y) * (c.z + d.z);
		y += (c.z - d.z) * (c.x + d.x);
		z += (c.x - d.x) * (c.y + d.y);
		// de
		x += (d.y - a.y) * (d.z + a.z);
		y += (d.z - a.z) * (d.x + a.x);
		z += (d.x - a.x) * (d.y + a.y);

		normal += vec3(x, y, z);
	}

#ifdef DEBUG
	normal = normalize(normal);
	if (isnan(length(normal))) {
		/* zero-length normal? */
		vNormal = vec3(1.0, 0.0, 0.0);
	} else {
		vNormal = normal;
	}
#else
	vNormal = normalize(normal);
#endif /* DEBUG */
}
