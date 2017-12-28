// https://en.wikibooks.org/wiki/GLSL_Programming/Unity/Specular_Highlights_at_Silhouettes
precision mediump float;

/*
 * tone mapping
 */

// enable tone mapping
//#define TONE_MAP

/*
 * gamma correction
 */

// enable gamma correction w/level
#define GAMMA			2.2

// enable linear pre-multiplied alpha
#define GAMMA_LINEAR_ALPHA

uniform bool uHasDiffuseTexture;
uniform sampler2D uDiffuseTexture;

uniform bool uHasNormalTexture;
uniform sampler2D uNormalTexture;

uniform bool uHasBumpTexture;
uniform sampler2D uBumpTexture;
uniform int uBumpTextureSize;
uniform float uBumpStrength;

uniform bool uHasSpecularTexture;
uniform sampler2D uSpecularTexture;

uniform bool uHasCutoutTexture;
uniform sampler2D uCutoutTexture;
uniform float uCutoutThreshold;

uniform bool uTranslucent;
uniform bool uTransparencyPhase;

uniform bool uSkin;

uniform vec3 uLightColor;
uniform vec3 uLightDirection;
uniform vec3 uAmbientColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform float uTexScaleMin;
uniform float uTexScaleMax;

varying vec4 vPosition;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
varying vec2 vTexCoord;
varying float vTexScale;

#ifdef GAMMA

vec3 toLinear(vec3 c) {
	return pow(c, vec3(GAMMA));
}
vec4 toLinear(vec4 c) {
#ifdef GAMMA_LINEAR_ALPHA
	return vec4(toLinear(c.rgb / c.a) * c.a, c.a);
#else
	return vec4(toLinear(c.rgb), c.a);
#endif /*GAMMA_LINEAR_ALPHA*/
}

vec3 toGamma(vec3 c) {
	return pow(c, vec3(1.0 / GAMMA));
}
vec4 toGamma(vec4 c) {
#ifdef GAMMA_LINEAR_ALPHA
	return vec4(toGamma(c.rgb / c.a) * c.a, c.a);
#else
	return vec4(toGamma(c.rgb), c.a);
#endif /*GAMMA_LINEAR_ALPHA*/
}

#endif /*GAMMA*/

#define KS_SPECULAR
#ifdef KS_SPECULAR

/*
 * Kelemen/Szirmay-Kalos specular from GPU Gems 3
 */

float fresnelReflectance(vec3 H, vec3 V, float F0)
{
	float base = 1.0 - dot(V, H);
	float exponential = pow(base, 5.0);
	return exponential + F0 * (1.0 - exponential);
}

float PHBeckman(float ndoth, float m)
{
	float alpha = acos(ndoth);
	float ta = tan(alpha);
	float mm = m*m;
	float val = 1.0 / (mm * pow(ndoth, 4.0)) * exp(-(ta*ta) / mm);
	return val;
}

float KS_Skin_Specular(vec3 N, vec3 L, vec3 V, float m, float rho_s)
{
	float result = 0.0;
	float ndotl = dot(N, L);
	if (ndotl > 0.0) {
		vec3 h = L + V; // Unnormalized half-way vector
		vec3 H = normalize(h);
		float ndoth = dot(N, H);
		float PH = PHBeckman(ndoth, m);
		float F = fresnelReflectance(H, V, 0.028);
		float frSpec = max(PH * F / dot(h, h), 0.0);
		result = ndotl * rho_s * frSpec; // BRDF * dot(N,L) * rho_s
	}
	return result;
}

#endif

#define BUMP_NORMAL
#ifdef BUMP_NORMAL

vec3 quadNormal(vec3 v0, vec3 v1, vec3 v2, vec3 v3) {
	vec3 n = vec3(
		(v0.y - v1.y) * (v0.z + v1.z),
		(v0.z - v1.z) * (v0.x + v1.x),
		(v0.x - v1.x) * (v0.y + v1.y)
	);
	n += vec3(
		(v1.y - v2.y) * (v1.z + v2.z),
		(v1.z - v2.z) * (v1.x + v2.x),
		(v1.x - v2.x) * (v1.y + v2.y)
	);
	n += vec3(
		(v2.y - v3.y) * (v2.z + v3.z),
		(v2.z - v3.z) * (v2.x + v3.x),
		(v2.x - v3.x) * (v2.y + v3.y)
	);
	n += vec3(
		(v3.y - v0.y) * (v3.z + v0.z),
		(v3.z - v0.z) * (v3.x + v0.x),
		(v3.x - v0.x) * (v3.y + v0.y)
	);
	//return normalize(n);
	return n;
}

vec3 bumpCoord(vec2 dxy, float scale, float bias) {
	return vec3(dxy, texture2D(uBumpTexture, vTexCoord + dxy).r * scale + bias);
}

/*
 * Compute the normal for the bump map by averaging the normals
 * of the 4 quads surrounding the current texture coordinate:
 *	0 1 2
 *	3 x 5
 *	6 7 8
 */
vec3 bumpNormal(float dt, float scale, float bias) {
	// quad coordinates
	vec3 c0 = bumpCoord(vec2(-dt, -dt), scale, bias);
	vec3 c1 = bumpCoord(vec2(0,   -dt), scale, bias);
	vec3 c2 = bumpCoord(vec2(dt,  -dt), scale, bias);
	vec3 c3 = bumpCoord(vec2(-dt, 0),   scale, bias);
	vec3 c4 = bumpCoord(vec2(0,   0),   scale, bias);
	vec3 c5 = bumpCoord(vec2(dt,  0),   scale, bias);
	vec3 c6 = bumpCoord(vec2(-dt, dt),  scale, bias);
	vec3 c7 = bumpCoord(vec2(0,   dt),  scale, bias);
	vec3 c8 = bumpCoord(vec2(dt,  dt),  scale, bias);

	// average normals
	vec3 n = quadNormal(c4, c3, c0, c1) +
		 quadNormal(c4, c1, c2, c5) +
		 quadNormal(c4, c5, c8, c7) +
		 quadNormal(c4, c7, c6, c3);
	return normalize(n);
}

#endif /*BUMP_NORMAL*/

//#define TEST_TEX_SCALE
#ifdef TEST_TEX_SCALE
void main() {
	if (uHasBumpTexture) {
		float scale = clamp(vTexScale, uTexScaleMin, uTexScaleMax);
		scale -= uTexScaleMin;
		scale /= uTexScaleMax - uTexScaleMin;
		gl_FragColor = vec4(scale, scale, scale, 1.0);
	} else {
		gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
	}
}
#else
void main() {
	vec3 v = normalize(-vPosition.xyz);
	vec3 normal = normalize(vNormal);

	vec2 uv = vTexCoord;
	vec3 eye;
	if (uHasNormalTexture) {
		vec3 tangent = normalize(vTangent);
		vec3 bitangent = normalize(vBitangent);
		mat3 tm = mat3(tangent, bitangent, normal);

		vec3 tn = texture2D(uNormalTexture, uv).rgb * 2.0 - 1.0;
#ifdef BUMP_NORMAL
		if (uHasBumpTexture) {
			float dt = 1.0 / float(uBumpTextureSize);
			float scale = 0.1 * uBumpStrength * vTexScale;
			float bias = 0.0;
			tn += bumpNormal(dt, scale, bias);
			tn = normalize(tn);
		}
#endif /*BUMP_NORMAL*/

		normal = normalize(tm * tn);
	}

	float weight = dot(normal, uLightDirection);

	vec4 color;
	if (uHasDiffuseTexture) {
		color = texture2D(uDiffuseTexture, uv);
	} else {
		color = vec4(vColor, 1.0);
	}
#ifdef GAMMA
	color = toLinear(color);
#endif /*GAMMA*/

	vec3 ambient = uAmbientColor * color.rgb;
	vec3 diffuse = uLightColor * color.rgb * max(weight, 0.0);

	vec3 specular;
	if (weight >= 0.0) {
#ifdef KS_SPECULAR
#define SPECULAR_SCALE	-0.35
#define SPECULAR_BIAS	0.35
if (uSkin) {
		float m = uShininess;
		if (uHasSpecularTexture) {
			m = texture2D(uSpecularTexture, uv).r;
		}
		m = m * SPECULAR_SCALE + SPECULAR_BIAS;
		float spec = KS_Skin_Specular(normal, uLightDirection, v, m, 1.0);
		specular = uSpecularColor * spec;
		//specular = vec3(spec);
} else {
#endif /*KS_SPECULAR*/
		vec3 h = normalize(uLightDirection + v);
		float w = pow(1.0 - max(0.0, dot(h, v)), 5.0);
		vec3 r = reflect(-uLightDirection, normal);
		float shininess = uShininess;
		if (uHasSpecularTexture) {
			vec4 s = texture2D(uSpecularTexture, uv);
			//shininess = 10.0 - s.r * 9.0;
			shininess = 9.0 - s.r * 8.0;
		}
		specular = uLightColor * //color.rgb *
			mix(uSpecularColor, vec3(1.0), w) *
			pow(max(dot(r, v), 0.0), shininess);
		if (uShininess != 0.0) {
			specular = specular * color.rgb;
		}
#ifdef KS_SPECULAR
}
#endif /*KS_SPECULAR*/
	} else {
		specular = vec3(0.0, 0.0, 0.0);
	}

	color = vec4(ambient + diffuse + specular, 1.0);
	if (uHasCutoutTexture) {
		float alpha = texture2D(uCutoutTexture, uv).r;
		if (!uTransparencyPhase) {
			if (alpha < uCutoutThreshold) {
				discard;
			}
		} else {
			// use pre-multiplied alpha
			color = vec4(color.rgb * alpha, alpha);
		}
	}
	if (uTranslucent) {
		float alpha = (specular.r + specular.g + specular.b) / 3.0;
		// use pre-multiplied alpha
		color = vec4(specular * alpha, alpha);
	}

#ifdef TONE_MAP
	color = vec4(color.rgb / (color.rgb + vec3(1.0)), color.a);
#endif /*TONE_MAP*/

	//color = vec4(specular, 1.0);
#ifdef GAMMA
	color = toGamma(color);
#endif /*GAMMA*/
	gl_FragColor = color;

	// debug
	//gl_FragColor = vec4(uv, 0.0, 1.0);
	//gl_FragColor = vec4(normalize(eye), 1.0);
	//gl_FragColor = vec4(v + eye, 1.0);
	//gl_FragColor = vec4(normal, 1.0);
}
#endif /*TEST_TEX_SCALE*/
