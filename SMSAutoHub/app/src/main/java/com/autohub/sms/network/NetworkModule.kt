package com.autohub.sms.network

import com.autohub.sms.BuildConfig
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.*
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder()
            .setLenient()
            .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            .create()
    }
    
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
        
        // 로깅 인터셉터 (디버그 모드에서만)
        if (BuildConfig.DEBUG) {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            builder.addInterceptor(loggingInterceptor)
        }
        
        // 인증 인터셉터
        builder.addInterceptor(AuthInterceptor())
        
        // 네트워크 캐시
        val cacheSize = 10 * 1024 * 1024L // 10MB
        val cache = Cache(androidx.core.content.ContextCompat.createTempDir(), cacheSize)
        builder.cache(cache)
        
        // 오프라인 캐시
        builder.addInterceptor(CacheInterceptor())
        
        return builder.build()
    }
    
    @Provides
    @Singleton
    @Named("BASE_URL")
    fun provideBaseUrl(): String {
        return BuildConfig.API_BASE_URL
    }
    
    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        gson: Gson,
        @Named("BASE_URL") baseUrl: String
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }
    
    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // TODO: 사용자 인증 토큰 추가
        // val token = TokenManager.getAccessToken()
        // if (token != null) {
        //     val authenticatedRequest = originalRequest.newBuilder()
        //         .header("Authorization", "Bearer $token")
        //         .build()
        //     return chain.proceed(authenticatedRequest)
        // }
        
        return chain.proceed(originalRequest)
    }
}

class CacheInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)
        
        // 오프라인 시 캐시 사용
        val cacheControl = CacheControl.Builder()
            .maxAge(5, TimeUnit.MINUTES)
            .build()
        
        return response.newBuilder()
            .header("Cache-Control", cacheControl.toString())
            .build()
    }
}