#version 300 es

/*
 * trivial fragment shader
 */

precision highp float;
precision highp int;

out vec4 fColor;

void main() {
	fColor = vec4(1.0, 0.0, 0.0, 1.0);
}
