precision mediump float;

uniform bool uHasDiffuseTexture;
uniform sampler2D uDiffuseTexture;

uniform vec3 uLightColor;
uniform vec3 uLightDirection;
uniform vec3 uAmbientColor;

varying vec4 vColor;
varying vec4 vNormal;
varying vec2 vTexCoord;

void main() {
	float weight = max(dot(normalize(vNormal.xyz), uLightDirection), 0.0);
	vec3 light = uAmbientColor + uLightColor * weight;
	if (uHasDiffuseTexture) {
		vec4 texColor = texture2D(uDiffuseTexture, vTexCoord);
		gl_FragColor = vec4(texColor.rgb * light, texColor.a);
	} else {
		gl_FragColor = vec4(vColor.rgb * light, vColor.a);
	}
}
