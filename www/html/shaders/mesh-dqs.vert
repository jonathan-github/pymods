#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;

/*
 * Transform feedback vertex shader to apply dual-quarternion linear blend skinning:
 *	Skinning with Dual Quarternins [Kavan 2007]
 */

#include "shaders/mesh-dqs.inc"

/// attribute locations
#define COORD_LOCATION 0
#define INDEX_LOCATION 1

/**
 * texture for accessing the vertex's array of (bone, weight) entries
 *	RG32F(bone, weight) = uWeights[texUV(offset)]
 *      ...
 *	RG32F(bone, weight) = uWeights[texUV(offset + count - 1)]
 */
uniform sampler2D uWeights;

/**
 * texture for accessing the bone's dual quarternion
 *	RGBA32F(rx,ry,rz,rw) = uBones[0, bone]
 *	RGBA32F(dx,dy,dz,dw) = uBones[1, bone]
 */
uniform sampler2D uBones;

/**
 * The vertex's untransformed coordinates.
 */
layout(location = COORD_LOCATION) in vec3 aCoord;

/**
 * The vertex's index into the weight map.
 */
layout(location = INDEX_LOCATION) in uvec2 aWeightIndex;

/**
 * The transformed vertex.
 */
out vec3 vCoord;

void main() {
	uint offset = uint(aWeightIndex.x);
	uint count = uint(aWeightIndex.y);

	/* fetch the first weight map entry */
	vec2 bw = texelFetch(uWeights, texUV(offset), 0).xy;
	uint bone = uint(bw[0]);
	float weight = bw[1];

	/* fetch the dquat for the first entry's bone */
	vec4 r0 = texelFetch(uBones, ivec2(0, bone), 0);
	vec4 d0 = texelFetch(uBones, ivec2(1, bone), 0);

	/* initialize the blended dquat for the vertex */
	vec4 r = r0 * weight;
	vec4 d = d0 * weight;

	for (uint i = offset + 1u, n = offset + count; i < n; ++i) {
		/* fetch the next weight map entry */
		bw = texelFetch(uWeights, texUV(i), 0).xy;
		bone = uint(bw[0]);
		weight = bw[1];

		/* fetch the dquat for the next entry's bone */
		vec4 ri = texelFetch(uBones, ivec2(0, bone), 0);
		vec4 di = texelFetch(uBones, ivec2(1, bone), 0);

		if (dot(r0, ri) < 0.0) {
			/* flip sign so DQi is in the same hemisphere */
			weight = -weight;
		}
		r += ri * weight;
		d += di * weight;
	}

	/* normalize */
	float l =  1.0 / length(r);
	r *= l;
	d *= l;

#ifdef USE_MATRIX
	/* convert dquat to mat4 */
	float x0 = r.x, y0 = r.y, z0 = r.z, w0 = r.w;
	float xe = d.x, ye = d.y, ze = d.z, we = d.w;
	float t0 = 2.0 * (-we * x0 + xe * w0 - ye * z0 + ze * y0);
	float t1 = 2.0 * (-we * y0 + xe * z0 + ye * w0 - ze * x0);
	float t2 = 2.0 * (-we * z0 - xe * y0 + ye * x0 + ze * w0);
	mat4 m = mat4(
		// col0
		1.0 - 2.0 * y0*y0 - 2.0 * z0*z0,
		2.0 * x0 * y0 + 2.0 * w0 * z0,
		2.0 * x0 * z0 - 2.0 * w0 * y0,
		0.0,
		// col1
		2.0 * x0 * y0 - 2.0 * w0 * z0,
		1.0 - 2.0 * x0*x0 - 2.0 * z0*z0,
		2.0 * y0 * z0 + 2.0 * w0 * x0,
		0.0,
		// col2
		2.0 * x0 * z0 + 2.0 * w0 * y0,
		2.0 * y0 * z0 - 2.0 * w0 * x0,
		1.0 - 2.0 * x0*x0 - 2.0 * y0*y0,
		0.0,
		// col3
		t0,
		t1,
		t2,
		1.0
	);

	vec4 pos = m * vec4(aCoord, 1.0);
	vCoord = pos.xyz;
	gl_Position = pos;
#else
	vCoord = aCoord +
		2.0 * cross(r.xyz, cross(r.xyz, aCoord) + r.w * aCoord) +
		2.0 * (r.w * d.xyz - d.w * r.xyz + cross(r.xyz, d.xyz));
	gl_Position = vec4(vCoord, 1.0);
#endif /* USE_MATRIX */
}
