package com.autohub.sms.network.dto

import com.google.gson.annotations.SerializedName

data class UserSettingsResponse(
    @SerializedName("user_id")
    val userId: String,
    
    @SerializedName("email")
    val email: String,
    
    @SerializedName("preferences")
    val preferences: UserPreferences,
    
    @SerializedName("subscription")
    val subscription: SubscriptionInfo,
    
    @SerializedName("usage")
    val usage: UsageInfo
)

data class UserPreferences(
    @SerializedName("enable_relay")
    val enableRelay: Boolean = true,
    
    @SerializedName("relay_targets")
    val relayTargets: List<String> = listOf("n8n", "telegram"),
    
    @SerializedName("mask_sensitive_info")
    val maskSensitiveInfo: Boolean = true,
    
    @SerializedName("enable_ai_filtering")
    val enableAiFiltering: Boolean = true,
    
    @SerializedName("auto_mark_as_read")
    val autoMarkAsRead: Boolean = false,
    
    @SerializedName("notification_enabled")
    val notificationEnabled: Boolean = true,
    
    @SerializedName("spam_filter_level")
    val spamFilterLevel: String = "medium", // low, medium, high
    
    @SerializedName("importance_threshold")
    val importanceThreshold: String = "medium", // low, medium, high
    
    @SerializedName("blocked_senders")
    val blockedSenders: List<String> = emptyList(),
    
    @SerializedName("allowed_senders")
    val allowedSenders: List<String> = emptyList(),
    
    @SerializedName("keyword_filters")
    val keywordFilters: List<KeywordFilter> = emptyList()
)

data class UserSettingsRequest(
    @SerializedName("preferences")
    val preferences: UserPreferences
)

data class KeywordFilter(
    @SerializedName("keyword")
    val keyword: String,
    
    @SerializedName("action")
    val action: String, // block, prioritize, categorize
    
    @SerializedName("category")
    val category: String? = null,
    
    @SerializedName("importance")
    val importance: String? = null
)

data class SubscriptionInfo(
    @SerializedName("plan")
    val plan: String, // free, premium, enterprise
    
    @SerializedName("status")
    val status: String, // active, cancelled, expired
    
    @SerializedName("monthly_limit")
    val monthlyLimit: Int,
    
    @SerializedName("current_usage")
    val currentUsage: Int,
    
    @SerializedName("renewal_date")
    val renewalDate: Long,
    
    @SerializedName("features")
    val features: List<String>
)

data class UsageInfo(
    @SerializedName("total_sms")
    val totalSms: Int,
    
    @SerializedName("this_month")
    val thisMonth: Int,
    
    @SerializedName("last_month")
    val lastMonth: Int,
    
    @SerializedName("spam_blocked")
    val spamBlocked: Int,
    
    @SerializedName("successfully_relayed")
    val successfullyRelayed: Int,
    
    @SerializedName("failed_relay")
    val failedRelay: Int
)

data class UsageStatsResponse(
    @SerializedName("daily_stats")
    val dailyStats: List<DailyStats>,
    
    @SerializedName("category_stats")
    val categoryStats: Map<String, Int>,
    
    @SerializedName("sender_stats")
    val senderStats: Map<String, Int>,
    
    @SerializedName("hourly_distribution")
    val hourlyDistribution: Map<String, Int>,
    
    @SerializedName("success_rate")
    val successRate: Double,
    
    @SerializedName("average_processing_time")
    val averageProcessingTime: Double
)

data class DailyStats(
    @SerializedName("date")
    val date: String,
    
    @SerializedName("total")
    val total: Int,
    
    @SerializedName("spam")
    val spam: Int,
    
    @SerializedName("relayed")
    val relayed: Int,
    
    @SerializedName("failed")
    val failed: Int
)

data class WebhookTestRequest(
    @SerializedName("webhook_url")
    val webhookUrl: String,
    
    @SerializedName("test_message")
    val testMessage: SmsRelayRequest
)

data class WebhookTestResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("response_code")
    val responseCode: Int,
    
    @SerializedName("response_body")
    val responseBody: String,
    
    @SerializedName("response_time")
    val responseTime: Long
)

data class HealthResponse(
    @SerializedName("status")
    val status: String,
    
    @SerializedName("version")
    val version: String,
    
    @SerializedName("uptime")
    val uptime: Long,
    
    @SerializedName("database_status")
    val databaseStatus: String,
    
    @SerializedName("ai_service_status")
    val aiServiceStatus: String,
    
    @SerializedName("relay_service_status")
    val relayServiceStatus: String
)