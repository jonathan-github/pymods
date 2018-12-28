#version 300 es

precision highp float;

/*
 * Transform feedback vertex shader to apply dual-quarternion linear blend skinning:
 *	Skinning with Dual Quarternins [Kavan 2007]
 *
 * Use this shader for meshes with a single weight mapped bone.
 */

#include "shaders/mesh-dqs.inc"

/// attribute locations
#define COORD_LOCATION 0

/**
 * The bone's real quarternion
 */
uniform vec4 uR;

/**
 * The bone's dual quarternion
 */
uniform vec4 uD;

/**
 * The vertex's untransformed coordinates.
 */
layout(location = COORD_LOCATION) in vec3 aCoord;

/**
 * The transformed vertex.
 */
out vec3 vCoord;

void main() {
	vCoord = aCoord +
		2.0 * cross(uR.xyz, cross(uR.xyz, aCoord) + uR.w * aCoord) +
		2.0 * (uR.w * uD.xyz - uD.w * uR.xyz + cross(uR.xyz, uD.xyz));
	gl_Position = vec4(vCoord, 1.0);
}
