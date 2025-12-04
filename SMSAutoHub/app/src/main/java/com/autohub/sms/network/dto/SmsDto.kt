package com.autohub.sms.network.dto

import com.google.gson.annotations.SerializedName

data class SmsRequest(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("sender")
    val sender: String,
    
    @SerializedName("content")
    val content: String,
    
    @SerializedName("timestamp")
    val timestamp: Long,
    
    @SerializedName("device_id")
    val deviceId: String? = null,
    
    @SerializedName("app_version")
    val appVersion: String? = null
)

data class SmsResponse(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("sender")
    val sender: String,
    
    @SerializedName("content")
    val content: String,
    
    @SerializedName("timestamp")
    val timestamp: Long,
    
    @SerializedName("is_read")
    val isRead: Boolean,
    
    @SerializedName("is_spam")
    val isSpam: Boolean,
    
    @SerializedName("importance")
    val importance: String,
    
    @SerializedName("category")
    val category: String,
    
    @SerializedName("keywords")
    val keywords: List<String>,
    
    @SerializedName("summary")
    val summary: String,
    
    @SerializedName("sentiment")
    val sentiment: String,
    
    @SerializedName("is_masked")
    val isMasked: Boolean,
    
    @SerializedName("relay_status")
    val relayStatus: String,
    
    @SerializedName("created_at")
    val createdAt: Long,
    
    @SerializedName("updated_at")
    val updatedAt: Long
)

data class SmsRelayRequest(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("sender")
    val sender: String,
    
    @SerializedName("content")
    val content: String,
    
    @SerializedName("timestamp")
    val timestamp: Long,
    
    @SerializedName("is_masked")
    val isMasked: Boolean = false,
    
    @SerializedName("category")
    val category: String? = null,
    
    @SerializedName("importance")
    val importance: String? = null,
    
    @SerializedName("keywords")
    val keywords: List<String> = emptyList(),
    
    @SerializedName("summary")
    val summary: String = "",
    
    @SerializedName("targets")
    val targets: List<String> = listOf("n8n", "telegram"),
    
    @SerializedName("priority")
    val priority: String = "normal"
)

data class SmsAnalysisRequest(
    @SerializedName("content")
    val content: String,
    
    @SerializedName("sender")
    val sender: String,
    
    @SerializedName("analysis_type")
    val analysisType: List<String> = listOf("spam", "category", "importance", "sentiment", "summary")
)

data class SmsAnalysisResponse(
    @SerializedName("is_spam")
    val isSpam: Boolean,
    
    @SerializedName("spam_probability")
    val spamProbability: Double,
    
    @SerializedName("category")
    val category: String,
    
    @SerializedName("importance")
    val importance: String,
    
    @SerializedName("keywords")
    val keywords: List<String>,
    
    @SerializedName("summary")
    val summary: String,
    
    @SerializedName("sentiment")
    val sentiment: String,
    
    @SerializedName("confidence_score")
    val confidenceScore: Double
)

data class MaskingRequest(
    @SerializedName("is_masked")
    val isMasked: Boolean,
    
    @SerializedName("masking_rules")
    val maskingRules: List<String>? = null
)