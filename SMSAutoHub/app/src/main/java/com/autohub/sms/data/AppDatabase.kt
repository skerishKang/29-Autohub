package com.autohub.sms.data

import android.content.Context
import androidx.room.*
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Database(
    entities = [SmsMessage::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    
    abstract fun smsDao(): SmsDao
    
    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null
        
        fun getDatabase(context: Context, scope: CoroutineScope): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "sms_database"
                )
                .addCallback(DatabaseCallback(scope))
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
        
        private class DatabaseCallback(
            private val scope: CoroutineScope
        ) : RoomDatabase.Callback() {
            
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                INSTANCE?.let { database ->
                    scope.launch {
                        populateDatabase(database.smsDao())
                    }
                }
            }
        }
        
        suspend fun populateDatabase(smsDao: SmsDao) {
            // 초기 데이터가 필요하다면 여기에 추가
            // 예: 샘플 데이터나 기본 설정 등
        }
    }
}

class Converters {
    @TypeConverter
    fun fromImportanceLevel(importance: ImportanceLevel): String {
        return importance.name
    }
    
    @TypeConverter
    fun toImportanceLevel(importance: String): ImportanceLevel {
        return ImportanceLevel.valueOf(importance)
    }
    
    @TypeConverter
    fun fromMessageCategory(category: MessageCategory): String {
        return category.name
    }
    
    @TypeConverter
    fun toMessageCategory(category: String): MessageCategory {
        return MessageCategory.valueOf(category)
    }
    
    @TypeConverter
    fun fromSentiment(sentiment: Sentiment): String {
        return sentiment.name
    }
    
    @TypeConverter
    fun toSentiment(sentiment: String): Sentiment {
        return Sentiment.valueOf(sentiment)
    }
    
    @TypeConverter
    fun fromRelayStatus(status: RelayStatus): String {
        return status.name
    }
    
    @TypeConverter
    fun toRelayStatus(status: String): RelayStatus {
        return RelayStatus.valueOf(status)
    }
    
    @TypeConverter
    fun fromStringList(list: List<String>): String {
        return list.joinToString(",")
    }
    
    @TypeConverter
    fun toStringList(data: String): List<String> {
        return if (data.isEmpty()) emptyList() else data.split(",")
    }
}