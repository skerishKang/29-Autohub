package com.autohub.sms.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface SmsDao {
    
    @Query("SELECT * FROM sms_messages ORDER BY timestamp DESC")
    fun getAllSmsFlow(): Flow<List<SmsMessage>>
    
    @Query("SELECT * FROM sms_messages ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentSms(limit: Int = 50): List<SmsMessage>
    
    @Query("SELECT * FROM sms_messages WHERE id = :id")
    suspend fun getSmsById(id: String): SmsMessage?
    
    @Query("SELECT * FROM sms_messages WHERE sender = :sender ORDER BY timestamp DESC")
    suspend fun getSmsBySender(sender: String): List<SmsMessage>
    
    @Query("SELECT * FROM sms_messages WHERE category = :category ORDER BY timestamp DESC")
    suspend fun getSmsByCategory(category: MessageCategory): List<SmsMessage>
    
    @Query("SELECT * FROM sms_messages WHERE importance = :importance ORDER BY timestamp DESC")
    suspend fun getSmsByImportance(importance: ImportanceLevel): List<SmsMessage>
    
    @Query("SELECT * FROM sms_messages WHERE is_spam = :isSpam ORDER BY timestamp DESC")
    suspend fun getSmsBySpamStatus(isSpam: Boolean): List<SmsMessage>
    
    @Query("SELECT * FROM sms_messages WHERE relay_status = :status ORDER BY timestamp DESC")
    suspend fun getSmsByRelayStatus(status: RelayStatus): List<SmsMessage>
    
    @Query("SELECT * FROM sms_messages WHERE timestamp BETWEEN :startTime AND :endTime ORDER BY timestamp DESC")
    suspend fun getSmsByDateRange(startTime: Long, endTime: Long): List<SmsMessage>
    
    @Query("SELECT * FROM sms_messages WHERE content LIKE '%' || :keyword || '%' ORDER BY timestamp DESC")
    suspend fun searchSmsByContent(keyword: String): List<SmsMessage>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSms(smsMessage: SmsMessage)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMultipleSms(smsMessages: List<SmsMessage>)
    
    @Update
    suspend fun updateSms(smsMessage: SmsMessage)
    
    @Update
    suspend fun updateMultipleSms(smsMessages: List<SmsMessage>)
    
    @Query("UPDATE sms_messages SET is_read = 1 WHERE id = :id")
    suspend fun markAsRead(id: String)
    
    @Query("UPDATE sms_messages SET is_read = 1 WHERE is_read = 0")
    suspend fun markAllAsRead()
    
    @Query("UPDATE sms_messages SET is_spam = :isSpam, category = :category, importance = :importance, keywords = :keywords, summary = :summary, sentiment = :sentiment, updated_at = :updatedAt WHERE id = :id")
    suspend fun updateAiAnalysis(
        id: String,
        isSpam: Boolean,
        category: MessageCategory,
        importance: ImportanceLevel,
        keywords: List<String>,
        summary: String,
        sentiment: Sentiment,
        updatedAt: Long
    )
    
    @Query("UPDATE sms_messages SET relay_status = :status, updated_at = :updatedAt WHERE id = :id")
    suspend fun updateRelayStatus(id: String, status: RelayStatus, updatedAt: Long)
    
    @Delete
    suspend fun deleteSms(smsMessage: SmsMessage)
    
    @Query("DELETE FROM sms_messages WHERE id = :id")
    suspend fun deleteSmsById(id: String)
    
    @Query("DELETE FROM sms_messages WHERE timestamp < :beforeTime")
    suspend fun deleteOldSms(beforeTime: Long)
    
    @Query("DELETE FROM sms_messages")
    suspend fun deleteAllSms()
    
    // 통계 관련 쿼리
    @Query("SELECT COUNT(*) FROM sms_messages")
    suspend fun getTotalSmsCount(): Int
    
    @Query("SELECT COUNT(*) FROM sms_messages WHERE timestamp >= :since")
    suspend fun getSmsCountSince(since: Long): Int
    
    @Query("SELECT COUNT(*) FROM sms_messages WHERE is_spam = 1 AND timestamp >= :since")
    suspend fun getSpamSmsCountSince(since: Long): Int
    
    @Query("SELECT COUNT(*) FROM sms_messages WHERE category = :category AND timestamp >= :since")
    suspend fun getSmsCountByCategorySince(category: MessageCategory, since: Long): Int
    
    @Query("SELECT COUNT(*) FROM sms_messages WHERE relay_status = :status AND timestamp >= :since")
    suspend fun getRelayStatusCountSince(status: RelayStatus, since: Long): Int
    
    @Query("SELECT DISTINCT sender FROM sms_messages ORDER BY timestamp DESC")
    suspend fun getAllSenders(): List<String>
    
    @Query("SELECT sender, COUNT(*) as count FROM sms_messages GROUP BY sender ORDER BY count DESC")
    suspend fun getSenderStatistics(): List<SenderStatistic>
}

data class SenderStatistic(
    val sender: String,
    val count: Int
)