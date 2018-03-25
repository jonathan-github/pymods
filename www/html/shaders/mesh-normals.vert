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
 *	RGB32UI(p1,p2,p3) = uNeighbors[texUV(offset)]
 *	..
 *	RGB32UI(p1,p2,p3) = uNeighbors[texUV(offset + count - 1)]
 * @note p0 is the current verrtex
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
	uint offset = aNeighborIndex.x;
	uint count = aNeighborIndex.y;
#ifdef DEBUG
	if (count == 0u) {
		/* shouldn't happen */
		vNormal = vec3(0.0, 0.0, 1.0);
		return;
	}
#endif /* DEBUG */

	vec3 a = texelFetch(uCoords, texUV(uint(gl_VertexID)), 0).xyz;
	vec3 normal = vec3(0.0);
	for (uint i = offset, n = offset + count; i < n; ++i) {
		// compute the normal for each neighboring poly
		uvec3 q = texelFetch(uNeighbors, texUV(i), 0).xyz;
		vec3 b = texelFetch(uCoords, texUV(q.x), 0).xyz;
		vec3 c = texelFetch(uCoords, texUV(q.y), 0).xyz;
		vec3 d = texelFetch(uCoords, texUV(q.z), 0).xyz;
		normal += (a - b).yzx * (a + b).zxy +
			  (b - c).yzx * (b + c).zxy +
			  (c - d).yzx * (c + d).zxy +
			  (d - a).yzx * (d + a).zxy;
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
