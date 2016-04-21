// https://en.wikibooks.org/wiki/GLSL_Programming/Unity/Specular_Highlights_at_Silhouettes
precision mediump float;

uniform bool uHasDiffuseTexture;
uniform sampler2D uDiffuseTexture;

uniform bool uHasCutoutTexture;
uniform sampler2D uCutoutTexture;

uniform vec3 uLightColor;
uniform vec3 uLightDirection;
uniform vec3 uAmbientColor;
uniform vec3 uSpecularColor;

varying vec4 vPosition;
varying vec3 vColor;
varying vec4 vNormal;
varying vec2 vTexCoord;

void main() {
	vec3 normal = normalize(vNormal.xyz);
	float weight = dot(normal, uLightDirection);

	vec4 color;
	if (uHasDiffuseTexture) {
		color = texture2D(uDiffuseTexture, vTexCoord);
	} else {
		color = vec4(vColor, 1.0);
	}

	vec3 ambient = uAmbientColor * color.rgb;
	vec3 diffuse = uLightColor * color.rgb * max(weight, 0.0);

	vec3 specular;
	if (weight >= 0.0) {
		vec3 v = normalize(-vPosition.xyz);
		vec3 h = normalize(uLightDirection + v);
		float w = pow(1.0 - max(0.0, dot(h, v)), 5.0);
		vec3 r = reflect(-uLightDirection, normal);
		specular = uLightColor * color.rgb *
			mix(uSpecularColor, vec3(1.0), w) *
			pow(max(dot(r, v), 0.0), 3.0);
	} else {
		specular = vec3(0.0, 0.0, 0.0);
	}

	color = vec4(ambient + diffuse + specular, 1.0);
	if (uHasCutoutTexture) {
		vec4 cutout = texture2D(uCutoutTexture, vTexCoord);
		float alpha = (cutout.r + cutout.g + cutout.b) / 3.0;
		// use pre-multiplied alpha
		color = vec4(color.rgb * alpha, alpha);
	}

	gl_FragColor = color;
}
