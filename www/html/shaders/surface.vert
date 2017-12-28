uniform mat4 pMatrix;
uniform mat4 vMatrix;
uniform mat4 mMatrix;
uniform mat4 nMatrix;

uniform vec3 uColor;

attribute vec3 aCoord;
attribute vec3 aNormal;
attribute vec4 aTangent;
attribute vec2 aTexCoord;
attribute float aTexScale;

varying vec4 vPosition;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
varying vec2 vTexCoord;
varying float vTexScale;

void main() {
	vPosition = vMatrix * mMatrix * vec4(aCoord, 1.0);
	gl_Position = pMatrix * vPosition;
	vColor = uColor;
	vNormal = (nMatrix * vec4(aNormal, 0.0)).xyz;
	vTangent = (nMatrix * vec4(aTangent.xyz, 0.0)).xyz;
	vBitangent = aTangent.w * cross(vNormal, vTangent);
	vTexCoord = aTexCoord;
	vTexScale = aTexScale;
}
