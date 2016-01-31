uniform mat4 pMatrix;
uniform mat4 vMatrix;
uniform mat4 mMatrix;

attribute vec3 aCoord;
//attribute vec3 aTexCoord;

varying vec3 vTexCoord;
 
void main() {
	gl_Position = pMatrix * vMatrix * mMatrix * vec4(aCoord, 1.0);

	// pass the texCoord to the fragment shader
	// The GPU will interpolate this value between points.
	//vTexCoord = aCoord;

	// rotate cube map texture 180d around the X axis
	vTexCoord = vec3(aCoord.x, -aCoord.yz);

	// rotate cube map texture 180d around the Z axis
	//vTexCoord = vec3(-aCoord.xy, aCoord.z);
}
