precision highp float;

// our texture
uniform samplerCube uCubeMap;

// the texCoords passed in from the vertex shader.
varying vec3 vTexCoord;

void main() {
	gl_FragColor = textureCube(uCubeMap, vTexCoord);
}
