plugins {
    id("com.android.application")
}

val ansVersionCode = (project.findProperty("ANS_VERSION_CODE") as String).toInt()
val ansVersionName = project.findProperty("ANS_VERSION_NAME") as String

// 签名密钥只从环境变量读，绝不进仓库。没配时 release 包不签名，CI 会直接失败。
val keystorePath: String? = System.getenv("ANS_KEYSTORE_PATH")

android {
    namespace = "fun.cauai.ans"
    compileSdk = 35

    defaultConfig {
        applicationId = "fun.cauai.ans"
        minSdk = 24
        targetSdk = 35
        versionCode = ansVersionCode
        versionName = ansVersionName
        buildConfigField("String", "HOME_URL", "\"https://ans.cauai.fun/competitions/agrihackathon\"")
        buildConfigField("String", "UPDATE_MANIFEST_URL", "\"https://ans.cauai.fun/downloads/android-latest.json\"")
    }

    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storeType = "pkcs12"
                storePassword = System.getenv("ANS_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANS_KEY_ALIAS")
                keyPassword = System.getenv("ANS_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystorePath != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.core:core:1.13.1")
}
