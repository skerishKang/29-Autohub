package com.autohub.sms.network.dto

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    @SerializedName("status")
    val status: String,
    
    @SerializedName("message")
    val message: String? = null,
    
    @SerializedName("data")
    val data: T? = null,
    
    @SerializedName("error")
    val error: ApiError? = null,
    
    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis()
)

data class ApiError(
    @SerializedName("code")
    val code: String,
    
    @SerializedName("message")
    val message: String,
    
    @SerializedName("details")
    val details: Map<String, Any>? = null
)

data class PagedResponse<T>(
    @SerializedName("items")
    val items: List<T>,
    
    @SerializedName("pagination")
    val pagination: Pagination
)

data class Pagination(
    @SerializedName("page")
    val page: Int,
    
    @SerializedName("limit")
    val limit: Int,
    
    @SerializedName("total")
    val total: Int,
    
    @SerializedName("totalPages")
    val totalPages: Int,
    
    @SerializedName("hasNext")
    val hasNext: Boolean,
    
    @SerializedName("hasPrevious")
    val hasPrevious: Boolean
)