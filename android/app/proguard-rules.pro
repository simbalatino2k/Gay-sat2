# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-keepattributes Signature

# Keep Capacitor Bridge & Plugins
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# Keep Android Billing Client
-keep class com.android.vending.billing.** { *; }
-keep interface com.android.vending.billing.** { *; }
-keep class com.android.billingclient.api.** { *; }
-keep interface com.android.billingclient.api.** { *; }

# Keep JavaScript Interface classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
