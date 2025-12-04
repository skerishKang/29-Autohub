package com.autohub.sms.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName
import java.util.Date

@Entity(tableName = "sms_messages")
data class SmsMessage(
    @PrimaryKey
    @SerializedName("id")
    val id: String,
    
    @SerializedName("sender")
    val sender: String,
    
    @SerializedName("content")
    val content: String,
    
    @SerializedName("timestamp")
    val timestamp: Long,
    
    @SerializedName("is_read")
    var isRead: Boolean = false,
    
    @SerializedName("is_spam")
    var isSpam: Boolean = false,
    
    @SerializedName("importance")
    var importance: ImportanceLevel = ImportanceLevel.MEDIUM,
    
    @SerializedName("category")
    var category: MessageCategory = MessageCategory.OTHER,
    
    @SerializedName("keywords")
    var keywords: List<String> = emptyList(),
    
    @SerializedName("summary")
    var summary: String = "",
    
    @SerializedName("sentiment")
    var sentiment: Sentiment = Sentiment.NEUTRAL,
    
    @SerializedName("is_masked")
    var isMasked: Boolean = false,
    
    @SerializedName("original_content")
    val originalContent: String = content,
    
    @SerializedName("relay_status")
    var relayStatus: RelayStatus = RelayStatus.PENDING,
    
    @SerializedName("created_at")
    val createdAt: Long = System.currentTimeMillis(),
    
    @SerializedName("updated_at")
    var updatedAt: Long = System.currentTimeMillis()
) {
    fun getFormattedTimestamp(): String {
        val date = Date(timestamp)
        return android.text.format.DateFormat.format("yyyy-MM-dd HH:mm:ss", date).toString()
    }
    
    fun getRelativeTimestamp(): String {
        val now = System.currentTimeMillis()
        val diff = now - timestamp
        
        return when {
            diff < 60_000 -> "방금"
            diff < 3600_000 -> "${diff / 60_000}분 전"
            diff < 86400_000 -> "${diff / 3600_000}시간 전"
            diff < 604800_000 -> "${diff / 86400_000}일 전"
            else -> getFormattedTimestamp()
        }
    }
    
    fun getMaskedContent(): String {
        return if (isMasked) {
            content
                .replace(Regex("\\b\\d{3}-\\d{4}-\\d{4}\\b"), "XXX-XXXX-XXXX")
                .replace(Regex("\\b\\d{3,4}-\\d{4}-\\d{4}\\b"), "XXXX-XXXX-XXXX")
                .replace(Regex("\\b\\d{6}\\b"), "XXXXXX")
                .replace(Regex("\\b[0-9]{16}\\b"), "XXXXXXXXXXXXXXXX")
        } else {
            content
        }
    }
}

enum class ImportanceLevel {
    LOW, MEDIUM, HIGH, URGENT
}

enum class MessageCategory {
    ADVERTISEMENT, BANKING, DELIVERY, PROMOTIONAL, PERSONAL, BUSINESS, VERIFICATION, OTHER
}

enum class Sentiment {
    POSITIVE, NEGATIVE, NEUTRAL
}

enum class RelayStatus {
    PENDING, SUCCESS, FAILED, RETRYING
}