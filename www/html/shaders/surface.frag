precision mediump float;

uniform bool uHasDiffuseTexture;
uniform sampler2D uDiffuseTexture;

uniform bool uHasCutoutTexture;
uniform sampler2D uCutoutTexture;

uniform vec3 uLightColor;
uniform vec3 uLightDirection;
uniform vec3 uAmbientColor;

varying vec3 vColor;
varying vec4 vNormal;
varying vec2 vTexCoord;

void main() {
	float weight = max(dot(normalize(vNormal.xyz), uLightDirection), 0.0);
	vec3 light = uAmbientColor + uLightColor * weight;
	vec4 color = vec4(vColor * light, 1.0);
	if (uHasDiffuseTexture) {
		vec4 texColor = texture2D(uDiffuseTexture, vTexCoord);
		color = vec4(texColor.rgb * light, texColor.a);
	}
	if (uHasCutoutTexture) {
		vec4 cutout = texture2D(uCutoutTexture, vTexCoord);
		float alpha = (cutout.r + cutout.g + cutout.b) / 3.0;
		// use pre-multiplied alpha
		color = vec4(color.rgb * alpha, alpha);
	}
	gl_FragColor = color;
}
