package com.autohub.sms.network

import com.autohub.sms.network.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    @POST("/api/sms")
    suspend fun sendSms(@Body request: SmsRequest): Response<ApiResponse<SmsResponse>>
    
    @POST("/api/sms/relay")
    suspend fun relaySms(@Body request: SmsRelayRequest): Response<ApiResponse<Unit>>
    
    @GET("/api/sms")
    suspend fun getSmsList(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50,
        @Query("category") category: String? = null,
        @Query("importance") importance: String? = null,
        @Query("sender") sender: String? = null,
        @Query("startDate") startDate: Long? = null,
        @Query("endDate") endDate: Long? = null
    ): Response<ApiResponse<PagedResponse<SmsResponse>>>
    
    @GET("/api/sms/{id}")
    suspend fun getSmsById(@Path("id") id: String): Response<ApiResponse<SmsResponse>>
    
    @PUT("/api/sms/{id}/read")
    suspend fun markAsRead(@Path("id") id: String): Response<ApiResponse<Unit>>
    
    @PUT("/api/sms/{id}/mask")
    suspend fun updateMasking(
        @Path("id") id: String,
        @Body request: MaskingRequest
    ): Response<ApiResponse<Unit>>
    
    @POST("/api/sms/analyze")
    suspend fun analyzeSms(@Body request: SmsAnalysisRequest): Response<ApiResponse<SmsAnalysisResponse>>
    
    @GET("/api/user/settings")
    suspend fun getUserSettings(): Response<ApiResponse<UserSettingsResponse>>
    
    @PUT("/api/user/settings")
    suspend fun updateUserSettings(@Body request: UserSettingsRequest): Response<ApiResponse<UserSettingsResponse>>
    
    @GET("/api/user/usage")
    suspend fun getUsageStats(): Response<ApiResponse<UsageStatsResponse>>
    
    @POST("/api/webhooks/test")
    suspend fun testWebhook(@Body request: WebhookTestRequest): Response<ApiResponse<WebhookTestResponse>>
    
    // Health check
    @GET("/api/health")
    suspend fun healthCheck(): Response<ApiResponse<HealthResponse>>
}