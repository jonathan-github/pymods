uniform mat4 pMatrix;
uniform mat4 vMatrix;
uniform mat4 mMatrix;
uniform mat4 nMatrix;

uniform vec4 uColor;

attribute vec3 aCoord;
attribute vec3 aNormal;

varying vec4 vColor;
varying vec4 vNormal;

void main() {
	gl_Position = pMatrix * vMatrix * mMatrix * vec4(aCoord, 1.0);
	vColor = uColor;
	vNormal = nMatrix * vec4(aNormal, 1.0);
}